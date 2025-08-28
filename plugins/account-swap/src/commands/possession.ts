import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandType, MessageModule, ClydeUtils } from "../types";
import { encodeMessage } from "../swap";
import { ensureInDMs, confirmAction } from "../utils/ui";
import { pendingPossessions, cleanupPossession } from "../utils/cleanup";

const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const { getToken } = findByProps("getToken");

export function createPossessInviteCommand() {
    return registerCommand({
        name: "possess-invite",
        displayName: "possess-invite",
        description: "Invite someone to possess your account (gives them your token).",
        displayDescription: "Invite someone to possess your account (gives them your token).",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            try {
                const otherUser = ensureInDMs(ctx);
                if (!otherUser) return;

                const isConfirmed = await confirmAction(
                    "⚠️ Invite Account Possession?",
                    `This will immediately give ${otherUser.username} full access to your Discord account. They will be able to do anything as you. Only proceed if you completely trust this person.`
                );
                if (!isConfirmed) return;

                const doubleConfirm = await confirmAction(
                    "⚠️ FINAL CONFIRMATION ⚠️",
                    "This action cannot be undone easily. Once you send your token, the other person will have complete control of your account. Are you absolutely certain?"
                );
                if (!doubleConfirm) return;

                const currentToken = getToken();
                if (!currentToken) {
                    return sendBotMessage(ctx.channel.id, "❌ **Possession Invite Failed**: Unable to retrieve your account token. Please try reloading Discord.");
                }

                const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                    nonce: Math.floor(Date.now() / 1000),
                    content: encodeMessage({ $: "POSSESS_INVITE", token: currentToken }),
                }, { });

                // Clean up the invite message after a short delay
                setTimeout(() => deleteMessage(ctx.channel.id, messageId).catch(() => {}), 2000);
                
                sendBotMessage(ctx.channel.id, `Possession invite sent to <@${otherUser.id}>. They now have access to your account.`);
            } catch (err) {
                console.error("Error in possess-invite command:", err);
                sendBotMessage(ctx.channel.id, `❌ **Possession Invite Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
            }
        },
    });
}

export function createPossessRequestCommand() {
    return registerCommand({
        name: "possess-request",
        displayName: "possess-request",
        description: "Request to possess someone else's account.",
        displayDescription: "Request to possess someone else's account.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            try {
                const otherUser = ensureInDMs(ctx);
                if (!otherUser) return;

                if (pendingPossessions.has(otherUser.id)) {
                    return sendBotMessage(ctx.channel.id, "You already have a pending possession request with this user.");
                }

                const isConfirmed = await confirmAction(
                    "Request Account Possession?",
                    `This will ask ${otherUser.username} to give you access to their Discord account. Only make this request if they have agreed to it.`
                );
                if (!isConfirmed) return;

                const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                    nonce: Math.floor(Date.now() / 1000),
                    content: encodeMessage({ $: "POSSESS_REQUEST" }),
                }, {});

                const possessionData = {
                    type: "request" as const,
                    relevantMessages: [messageId],
                    timeout: setTimeout(async () => {
                        // Clean up the pending possession and messages after 30 seconds
                        await deleteMessage(ctx.channel.id, messageId).catch(() => {});
                        sendBotMessage(ctx.channel.id, "Possession request timed out after 30 seconds.");
                        cleanupPossession(otherUser.id);
                    }, 30000)
                };
                
                pendingPossessions.set(otherUser.id, possessionData);
            } catch (err) {
                console.error("Error in possess-request command:", err);
                sendBotMessage(ctx.channel.id, `❌ **Possession Request Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
            }
        },
    });
}
