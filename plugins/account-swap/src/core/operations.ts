import { findByProps } from "@vendetta/metro";
import { findByProps as findByPropsMetro } from "@vendetta/metro";
import { MessageModule, ClydeUtils } from "../types";
import { cleanupSwap, cleanupPossession } from "../utils/cleanup";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const { deleteMessage } = findByPropsMetro("sendMessage", "deleteMessage") as MessageModule;
const { getToken } = findByProps("getToken");

/**
 * Performs possession by switching to the provided token and cleaning up messages
 */
export async function performPossession(channelId: string, otherUserId: string, token: string, messages: string[]) {
    try {
        // Validate token
        if (!token || token.length < 50) {
            sendBotMessage(channelId, "❌ **Possession Failed**: Invalid or corrupted token received.");
            return;
        }

        // 1. Delete all possession-related messages to hide the exchange.
        const deleteResults = await Promise.allSettled(
            messages.map(msgId => deleteMessage(channelId, msgId))
        );
        
        const failedDeletes = deleteResults.filter(result => result.status === 'rejected').length;
        if (failedDeletes > 0) {
            console.warn(`Failed to delete ${failedDeletes} possession messages`);
            // Don't fail the whole operation for message deletion failures
        }

        // 2. Add a 1s delay before performing the account switch.
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Perform the account switch.
        try {
            const authModule = findByProps("login", "logout", "switchAccountToken");
            if (!authModule || !authModule.switchAccountToken) {
                throw new Error("Authentication module not found or invalid");
            }
            authModule.switchAccountToken(token);
        } catch (switchError) {
            console.error("Token switch failed:", switchError);
            sendBotMessage(channelId, "❌ **Possession Failed**: Unable to switch accounts. The token may be invalid or expired.");
            return;
        }

    } catch (err) {
        console.error("Failed during possession:", err);
        sendBotMessage(channelId, `❌ **Possession Failed**: ${err.message || 'Unknown error occurred'}. You may need to log in manually.`);
    } finally {
        // 4. Clean up the pending state.
        cleanupPossession(otherUserId);
    }
}

/**
 * Finalizes a swap by deleting messages, switching tokens, and clearing state.
 */
export async function finalizeSwap(channelId: string, otherUserId: string, swapData: { newToken?: string; relevantMessages: string[] }) {
    if (!swapData?.newToken) {
        console.error("Swap Error: Cannot finalize swap, new token is missing.");
        sendBotMessage(channelId, "❌ **Swap Failed**: Critical error - missing token data. No action was taken.");
        cleanupSwap(otherUserId);
        return;
    }

    try {
        // Validate token
        if (swapData.newToken.length < 50) {
            sendBotMessage(channelId, "❌ **Swap Failed**: Invalid or corrupted token received.");
            cleanupSwap(otherUserId);
            return;
        }

        // 1. Delete all swap-related messages to hide the exchange.
        const deleteResults = await Promise.allSettled(
            swapData.relevantMessages.map(msgId => deleteMessage(channelId, msgId))
        );
        
        const failedDeletes = deleteResults.filter(result => result.status === 'rejected').length;
        if (failedDeletes > 0) {
            console.warn(`Failed to delete ${failedDeletes} swap messages`);
            sendBotMessage(channelId, "⚠️ **Warning**: Some messages couldn't be cleaned up, but swap will continue.");
        }

        // 2. Add a 1s delay before performing the account switch.
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Perform the account switch.
        try {
            const authModule = findByProps("login", "logout", "switchAccountToken");
            if (!authModule || !authModule.switchAccountToken) {
                throw new Error("Authentication module not found or invalid");
            }
            authModule.switchAccountToken(swapData.newToken);
        } catch (switchError) {
            console.error("Token switch failed:", switchError);
            sendBotMessage(channelId, "❌ **Swap Failed**: Unable to switch accounts. The token may be invalid or expired.");
            return;
        }

    } catch (err) {
        console.error("Failed during final swap stage:", err);
        sendBotMessage(channelId, `❌ **Swap Failed**: ${err.message || 'Unknown error occurred'}. You may need to log in manually.`);
    } finally {
        // 4. Always clean up the pending state.
        cleanupSwap(otherUserId);
    }
}
