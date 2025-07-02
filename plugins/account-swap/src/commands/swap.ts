import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandType, MessageModule, ClydeUtils } from "../types";
import { encodeMessage } from "../swap";
import { ensureInDMs, confirmAction } from "../utils/ui";
import { pendingSwaps, cleanupSwap } from "../utils/cleanup";

const { sendMessage, deleteMessage } = findByProps("sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const { getToken } = findByProps("getToken");

export function createSwapCommand() {
    return registerCommand({
        name: "swap",
        displayName: "swap",
        description: "Initiate an account swap with the other user.",
        displayDescription: "Initiate an account swap with the other user.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            try {
                const otherUser = ensureInDMs(ctx);
                if (!otherUser) return;

                if (pendingSwaps.has(otherUser.id)) {
                    return sendBotMessage(ctx.channel.id, "You already have a pending swap with this user.");
                }

                const isConfirmed = await confirmAction(
                    "Initiate Account Swap?",
                    "This will start the swap process. Your account may be at risk if the other user is not trustworthy."
                );
                if (!isConfirmed) return;

                const currentToken = getToken();
                if (!currentToken) {
                    return sendBotMessage(ctx.channel.id, "❌ **Swap Failed**: Unable to retrieve your account token. Please try reloading Discord.");
                }

                const { body: { id: messageId } } = await sendMessage(ctx.channel.id, {
                    content: encodeMessage({ $: "SWAP_REQUEST" }),
                });

                const swapData = {
                    iStartedIt: true,
                    relevantMessages: [messageId],
                    timeout: setTimeout(async () => {
                        // Clean up the pending swap and messages after 30 seconds
                        await deleteMessage(ctx.channel.id, messageId).catch(() => {});
                        sendBotMessage(ctx.channel.id, "Swap request timed out after 30 seconds.");
                        cleanupSwap(otherUser.id);
                    }, 30000)
                };
                
                pendingSwaps.set(otherUser.id, swapData);
            } catch (err) {
                console.error("Error in swap command:", err);
                sendBotMessage(ctx.channel.id, `❌ **Swap Command Failed**: ${err.message || 'Unknown error occurred'}.`);
            }
        },
    });
}
