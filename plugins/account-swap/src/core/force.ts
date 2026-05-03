import { storage } from "@vendetta/plugin";
import { findByStoreName } from "@vendetta/metro";
import { cleanupAll as cleanupAllPending } from "../utils/cleanup";

export interface ForcedSwapState {
    active: boolean;
    targetUserId: string;
    targetUsername: string;
    originalUserId: string;
    endTimeMs: number;
}

const UserStore = findByStoreName("UserStore");

export const pendingForceSwapDuration: { ms: number } = { ms: 0 };

export function isForcedSwapActive(): boolean {
    const state = getForcedSwapState();
    if (!state?.active) return false;
    if (Date.now() >= state.endTimeMs) {
        cancelForcedSwap();
        return false;
    }
    return true;
}

export function getForcedSwapState(): ForcedSwapState | null {
    return (storage.forcedSwap as ForcedSwapState) ?? null;
}

export function getTimeRemainingMs(): number {
    const state = getForcedSwapState();
    if (!state?.active) return 0;
    return Math.max(0, state.endTimeMs - Date.now());
}

export function startForcedSwap(userId: string, username: string, durationMs: number) {
    const originalUserId = UserStore?.getCurrentUser()?.id || userId;

    storage.forcedSwap = {
        active: true,
        targetUserId: userId,
        targetUsername: username,
        originalUserId,
        endTimeMs: Date.now() + durationMs,
    } as ForcedSwapState;
}

export function cancelForcedSwap() {
    storage.forcedSwap = undefined;
    cleanupAllPending();
}
