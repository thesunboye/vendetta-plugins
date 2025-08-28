import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { decodeMessage, encodeMessage } from "../swap";
import { MessageModule, ClydeUtils } from "../types";
import { pendingSwaps, pendingPossessions, cleanupSwap, cleanupPossession } from "../utils/cleanup";
import { confirmAction } from "../utils/ui";
import { performPossession, finalizeSwap } from "../core/operations";

const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");
const { getToken } = findByProps("getToken");

/**
 * Creates and returns the message protocol patch
 */
export function createMessagePatch() {
    return before("dispatch", FluxDispatcher, (args) => {
        const [event] = args;
        if (event?.type !== "MESSAGE_CREATE" || !event?.message?.content || event.message.author.id === UserStore.getCurrentUser()?.id) {
            return;
        }

        const { message } = event;
        const decoded = decodeMessage(message.content);
        if (!decoded?.$?.startsWith("SWAP_") && !decoded?.$?.startsWith("POSSESS_")) return;

        (async () => {
            const { author, channel_id: channelId } = message;
            const pendingSwap = pendingSwaps.get(author.id);
            const pendingPossession = pendingPossessions.get(author.id);

            switch (decoded.$) {
                case "SWAP_REQUEST":
                    if (pendingSwap) return; // Ignore duplicate requests

                    try {
                        const isWhitelisted = storage.whitelist.includes(author.id);
                        const acceptFromEveryone = storage.acceptFromEveryone;
                        
                        let isConfirmed = false;
                        if (acceptFromEveryone) {
                            isConfirmed = true;
                        } else if (isWhitelisted) {
                            isConfirmed = true;
                        } else {
                            isConfirmed = await confirmAction(
                                `Accept swap from ${author.username}?`,
                                "This will send your account token to the other user. Only proceed if you trust this person implicitly."
                            );
                        }

                        if (!isConfirmed) {
                            const { body: { id: cancelMsgId } } = await _sendMessage(channelId, { 
                                nonce: Math.floor(Date.now() / 1000),
                                content: encodeMessage({ $: "SWAP_CANCEL" }) 
                            }, { });
                            // Clean up the cancel message after a brief delay
                            setTimeout(() => deleteMessage(channelId, cancelMsgId).catch(() => {}), 2000);
                            // Also clean up the original request message
                            setTimeout(() => deleteMessage(channelId, message.id).catch(() => {}), 2000);
                            return;
                        }

                        const currentToken = getToken();
                        if (!currentToken) {
                            sendBotMessage(channelId, "❌ **Swap Failed**: Unable to retrieve your account token. Please try reloading Discord.");
                            return;
                        }

                        const { body: { id: msgId } } = await _sendMessage(channelId, {
                            nonce: Math.floor(Date.now() / 1000),
                            content: encodeMessage({ $: "SWAP_RESPONSE", token: currentToken })
                        }, { });

                        pendingSwaps.set(author.id, {
                            iStartedIt: false,
                            relevantMessages: [message.id, msgId],
                        });
                    } catch (err) {
                        console.error("Error handling SWAP_REQUEST:", err);
                        sendBotMessage(channelId, `❌ **Swap Request Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                    }
                    break;

                case "SWAP_RESPONSE":
                    if (!pendingSwap || !pendingSwap.iStartedIt || !decoded.token) return;

                    try {
                        if (decoded.token.length < 50) {
                            sendBotMessage(channelId, "❌ **Swap Failed**: Received invalid token from other user.");
                            cleanupSwap(author.id);
                            return;
                        }

                        pendingSwap.newToken = decoded.token;
                        pendingSwap.relevantMessages.push(message.id);

                        const currentToken = getToken();
                        if (!currentToken) {
                            sendBotMessage(channelId, "❌ **Swap Failed**: Unable to retrieve your account token. Please try reloading Discord.");
                            cleanupSwap(author.id);
                            return;
                        }

                        const { body: { id: finalizeMsgId } } = await _sendMessage(channelId, {
                            nonce: Math.floor(Date.now() / 1000),
                            content: encodeMessage({ $: "SWAP_FINALIZE", token: currentToken })
                        }, { });
                        pendingSwap.relevantMessages.push(finalizeMsgId);

                        await finalizeSwap(channelId, author.id, pendingSwap);
                    } catch (err) {
                        console.error("Error handling SWAP_RESPONSE:", err);
                        sendBotMessage(channelId, `❌ **Swap Response Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                        cleanupSwap(author.id);
                    }
                    break;

                case "SWAP_FINALIZE":
                    if (!pendingSwap || pendingSwap.iStartedIt || !decoded.token) return;

                    try {
                        if (decoded.token.length < 50) {
                            sendBotMessage(channelId, "❌ **Swap Failed**: Received invalid token from other user.");
                            cleanupSwap(author.id);
                            return;
                        }

                        pendingSwap.newToken = decoded.token;
                        pendingSwap.relevantMessages.push(message.id);

                        await finalizeSwap(channelId, author.id, pendingSwap);
                    } catch (err) {
                        console.error("Error handling SWAP_FINALIZE:", err);
                        sendBotMessage(channelId, `❌ **Swap Finalization Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                        cleanupSwap(author.id);
                    }
                    break;

                case "SWAP_CANCEL":
                    if (!pendingSwap) return;
                    
                    try {
                        // Clean up all messages from the swap
                        await Promise.allSettled([
                            ...pendingSwap.relevantMessages.map(msgId => deleteMessage(channelId, msgId)),
                            deleteMessage(channelId, message.id) // Also delete the cancel message
                        ]);
                        
                        sendBotMessage(channelId, `<@${author.id}> cancelled the swap request.`);
                        cleanupSwap(author.id);
                    } catch (err) {
                        console.error("Error handling SWAP_CANCEL:", err);
                        sendBotMessage(channelId, `⚠️ **Cleanup Warning**: Swap was cancelled but some messages couldn't be deleted.`);
                        cleanupSwap(author.id);
                    }
                    break;

                // --- Possession Protocol ---
                case "POSSESS_INVITE":
                    if (!decoded.token) return;
                    
                    try {
                        if (decoded.token.length < 50) {
                            sendBotMessage(channelId, "❌ **Possession Failed**: Received invalid token from inviter.");
                            deleteMessage(channelId, message.id).catch(() => {});
                            return;
                        }

                        const isWhitelisted = storage.whitelist.includes(author.id);
                        const acceptMode = storage.possessAcceptMode || "none";

                        let isConfirmed = false;
                        if (acceptMode === "both" || acceptMode === "invite") {
                            isConfirmed = true;
                        } else if (isWhitelisted) {
                            isConfirmed = true;
                        } else {
                            isConfirmed = await confirmAction(
                                `Accept possession of ${author.username}'s account?`,
                                "This will log you into their account, giving you full access. Only proceed if you were expecting this and trust this person completely."
                            );
                        }

                        if (!isConfirmed) {
                            // User cancelled. Just delete the invite message.
                            deleteMessage(channelId, message.id).catch(() => {});
                            sendBotMessage(channelId, `You rejected the possession invite from <@${author.id}>.`);
                            return;
                        }

                        // User confirmed, proceed with possession.
                        sendBotMessage(channelId, `Accepting possession invite from <@${author.id}>. Switching now...`);
                        await performPossession(channelId, author.id, decoded.token, [message.id]);

                    } catch (err) {
                        console.error("Error handling POSSESS_INVITE:", err);
                        sendBotMessage(channelId, `❌ **Possession Invite Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                    }
                    break;

                case "POSSESS_REQUEST":
                    if (pendingPossession) return; // Ignore duplicate requests

                    try {
                        const isWhitelistedForPossess = storage.whitelist.includes(author.id);
                        const acceptModeForPossess = storage.possessAcceptMode || "none";
                        
                        let isPossessConfirmed = false;
                        if (acceptModeForPossess === "both" || acceptModeForPossess === "request") {
                            isPossessConfirmed = true;
                        } else if (isWhitelistedForPossess) {
                            isPossessConfirmed = true;
                        } else {
                            isPossessConfirmed = await confirmAction(
                                `Allow ${author.username} to possess your account?`,
                                "This will give them full access to your Discord account. Only proceed if you trust this person completely."
                            );
                        }

                        if (!isPossessConfirmed) {
                            const { body: { id: cancelPossessMsgId } } = await _sendMessage(channelId, { 
                                nonce: Math.floor(Date.now() / 1000),
                                content: encodeMessage({ $: "POSSESS_CANCEL" }) 
                            }, { });
                            // Clean up messages after a brief delay
                            setTimeout(() => deleteMessage(channelId, cancelPossessMsgId).catch(() => {}), 2000);
                            setTimeout(() => deleteMessage(channelId, message.id).catch(() => {}), 2000);
                            return;
                        }

                        const currentToken = getToken();
                        if (!currentToken) {
                            sendBotMessage(channelId, "❌ **Possession Request Failed**: Unable to retrieve your account token. Please try reloading Discord.");
                            return;
                        }

                        const { body: { id: acceptMsgId } } = await _sendMessage(channelId, {
                            nonce: Math.floor(Date.now() / 1000),
                            content: encodeMessage({ $: "POSSESS_ACCEPT", token: currentToken })
                        }, { });

                        // Clean up messages after sending
                        setTimeout(async () => {
                            await Promise.allSettled([
                                deleteMessage(channelId, message.id),
                                deleteMessage(channelId, acceptMsgId)
                            ]);
                        }, 1000);
                    } catch (err) {
                        console.error("Error handling POSSESS_REQUEST:", err);
                        sendBotMessage(channelId, `❌ **Possession Request Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                    }
                    break;

                case "POSSESS_ACCEPT":
                    if (!pendingPossession || pendingPossession.type !== "request" || !decoded.token) return;

                    try {
                        if (decoded.token.length < 50) {
                            sendBotMessage(channelId, "❌ **Possession Failed**: Received invalid token from other user.");
                            cleanupPossession(author.id);
                            return;
                        }

                        // Someone accepted our request to possess their account
                        await performPossession(channelId, author.id, decoded.token, [...pendingPossession.relevantMessages, message.id]);
                        sendBotMessage(channelId, `<@${author.id}> granted you access to their account. Switching now...`);
                    } catch (err) {
                        console.error("Error handling POSSESS_ACCEPT:", err);
                        sendBotMessage(channelId, `❌ **Possession Accept Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
                        cleanupPossession(author.id);
                    }
                    break;

                case "POSSESS_CANCEL":
                    if (!pendingPossession) return;
                    
                    try {
                        // Clean up all messages from the possession request
                        await Promise.allSettled([
                            ...pendingPossession.relevantMessages.map(msgId => deleteMessage(channelId, msgId)),
                            deleteMessage(channelId, message.id) // Also delete the cancel message
                        ]);
                        
                        sendBotMessage(channelId, `<@${author.id}> cancelled the possession request.`);
                        cleanupPossession(author.id);
                    } catch (err) {
                        console.error("Error handling POSSESS_CANCEL:", err);
                        sendBotMessage(channelId, `⚠️ **Cleanup Warning**: Possession was cancelled but some messages couldn't be deleted.`);
                        cleanupPossession(author.id);
                    }
                    break;
            }
        })().catch(err => console.error("Swap Plugin Error:", err));

        return args;
    });
}
