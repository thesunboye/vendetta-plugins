import { findByProps } from "@vendetta/metro";
import { MessageModule } from "../types";

const { deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;

export interface PendingSwap {
    iStartedIt: boolean;
    newToken?: string;
    relevantMessages: string[];
    timeout?: NodeJS.Timeout;
}

export interface PendingPossession {
    type: "invite" | "request";
    relevantMessages: string[];
    timeout?: NodeJS.Timeout;
}

export const pendingSwaps = new Map<string, PendingSwap>();
export const pendingPossessions = new Map<string, PendingPossession>();

/**
 * Cleans up a pending swap by clearing timeout and removing from map
 */
export const cleanupSwap = (userId: string) => {
    const swapData = pendingSwaps.get(userId);
    if (swapData?.timeout) {
        clearTimeout(swapData.timeout);
    }
    pendingSwaps.delete(userId);
};

/**
 * Cleans up a pending possession by clearing timeout and removing from map
 */
export const cleanupPossession = (userId: string) => {
    const possessionData = pendingPossessions.get(userId);
    if (possessionData?.timeout) {
        clearTimeout(possessionData.timeout);
    }
    pendingPossessions.delete(userId);
};

/**
 * Cleans up all pending operations on plugin unload
 */
export const cleanupAll = () => {
    // Clean up all timeouts before unloading
    pendingSwaps.forEach((swapData) => {
        if (swapData.timeout) {
            clearTimeout(swapData.timeout);
        }
    });
    
    pendingPossessions.forEach((possessionData) => {
        if (possessionData.timeout) {
            clearTimeout(possessionData.timeout);
        }
    });
    
    pendingSwaps.clear();
    pendingPossessions.clear();
};
