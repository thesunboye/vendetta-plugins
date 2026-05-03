import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { encodeMessage } from "../swap";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils, MessageModule } from "../types";
import { cleanupSwap, pendingSwaps } from "../utils/cleanup";
import { confirmAction, ensureInDMs } from "../utils/ui";
import { cancelForcedSwap, getForcedSwapState, getTimeRemainingMs, isForcedSwapActive } from "../core/force";

const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const { getToken } = findByProps("getToken");

const DURATION_CHOICES = [
    { name: "5 minutes", displayName: "5 minutes", label: "5 min", value: "300000" },
    { name: "15 minutes", displayName: "15 minutes", label: "15 min", value: "900000" },
    { name: "30 minutes", displayName: "30 minutes", label: "30 min", value: "1800000" },
    { name: "1 hour", displayName: "1 hour", label: "1 hr", value: "3600000" },
    { name: "3 hours", displayName: "3 hours", label: "3 hr", value: "10800000" },
    { name: "6 hours", displayName: "6 hours", label: "6 hr", value: "21600000" },
];

export function createForceSwapCommand() {
    return registerCommand({
        name: "force-swap",
        displayName: "force-swap",
        description: "Initiate a time-limited forced account swap.",
        displayDescription: "Initiate a time-limited forced account swap.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "duration",
                displayName: "duration",
                description: "How long the forced swap will last",
                displayDescription: "How long the forced swap will last",
                type: ApplicationCommandOptionType.STRING as number,
                required: true,
                choices: DURATION_CHOICES as any,
            },
        ],
        async execute(args, ctx) {
            try {
                if (isForcedSwapActive()) {
                    return sendBotMessage(ctx.channel.id, "🔒 You are already in a forced swap. Use `/force-cancel` to end it first.");
                }

                const otherUser = ensureInDMs(ctx);
                if (!otherUser) return;

                if (pendingSwaps.has(otherUser.id)) {
                    return sendBotMessage(ctx.channel.id, "You already have a pending swap with this user.");
                }

                const durationMs = parseInt(args.find(a => a.name === "duration")?.value as string, 10);
                const durationLabel = DURATION_CHOICES.find(c => c.value === String(durationMs))?.label || `${durationMs / 60000} min`;

                const isConfirmed = await confirmAction(
                    "🔒 Initiate Forced Swap?",
                    `This will swap your account with **${otherUser.username}** for **${durationLabel}**. During this period:\n\n`
                        + "• The multi-account switcher will be disabled\n"
                        + "• Logout will be blocked\n"
                        + "• All swap commands will be disabled\n"
                        + "• A lock emoji (🔒) will appear on the display name\n\n"
                        + "The only way to cancel early is `/force-cancel` with 3 confirmation prompts.\n\n"
                        + "Are you sure you want to proceed?",
                );
                if (!isConfirmed) return;

                const currentToken = getToken();
                if (!currentToken) {
                    return sendBotMessage(ctx.channel.id, "❌ **Force Swap Failed**: Unable to retrieve your account token.");
                }

                const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                    nonce: Math.floor(Date.now() / 1000),
                    content: encodeMessage({ $: "FORCE_SWAP", duration: durationMs }),
                }, {});

                const swapData = {
                    iStartedIt: true,
                    relevantMessages: [messageId],
                    forceDuration: durationMs,
                    timeout: setTimeout(async () => {
                        await deleteMessage(ctx.channel.id, messageId).catch(() => {});
                        sendBotMessage(ctx.channel.id, "Force swap request timed out after 30 seconds.");
                        cleanupSwap(otherUser.id);
                    }, 30000),
                };

                pendingSwaps.set(otherUser.id, swapData);
            } catch (err) {
                console.error("Error in force-swap command:", err);
                sendBotMessage(ctx.channel.id, `❌ **Force Swap Failed**: ${err.stack ?? err.message ?? "Unknown error occurred"}.`);
            }
        },
    });
}

export function createForceCancelCommand() {
    return registerCommand({
        name: "force-cancel",
        displayName: "force-cancel",
        description: "Cancel the active forced swap with 3 confirmation prompts.",
        displayDescription: "Cancel the active forced swap with 3 confirmation prompts.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            if (!isForcedSwapActive()) {
                return sendBotMessage(ctx.channel.id, "There is no active forced swap to cancel.");
            }

            const confirm1 = await confirmAction(
                "⚠️ Cancel Forced Swap? (1/3)",
                "This is the **first** confirmation. Are you sure you want to end the forced swap?",
            );
            if (!confirm1) return;

            const confirm2 = await confirmAction(
                "⚠️ Are you sure? (2/3)",
                "This is the **second** confirmation. Ending the forced swap will lift all restrictions. Do you want to continue?",
            );
            if (!confirm2) return;

            const confirm3 = await confirmAction(
                "⚠️ Final Confirmation (3/3)",
                "This is your **last chance** to back out. Ending the forced swap cannot be undone for this session. Are you absolutely sure?",
            );
            if (!confirm3) return;

            cancelForcedSwap();
            sendBotMessage(ctx.channel.id, "✅ Forced swap has been cancelled. All restrictions have been lifted.");
        },
    });
}

export function createForceStatusCommand() {
    return registerCommand({
        name: "force-status",
        displayName: "force-status",
        description: "Check the status of the active forced swap.",
        displayDescription: "Check the status of the active forced swap.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            if (!isForcedSwapActive()) {
                return sendBotMessage(ctx.channel.id, "No forced swap is currently active.");
            }

            const s = getForcedSwapState();
            const remaining = getTimeRemainingMs();

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            sendBotMessage(
                ctx.channel.id,
                `🔒 **Forced Swap Active**\n`
                    + `Swapped with: **${s?.targetUsername}**\n`
                    + `Time remaining: **${minutes}m ${seconds}s**\n`
                    + `Use \`/force-cancel\` to end it early.`,
            );
        },
    });
}
