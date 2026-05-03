import { storage } from "@vendetta/plugin";
import { findByStoreName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { cleanupAll as cleanupAllPending } from "../utils/cleanup";

export interface ForcedSwapState {
    active: boolean;
    targetUserId: string;
    targetUsername: string;
    originalUserId: string;
    endTimeMs: number;
}

const UserStore = findByStoreName("UserStore");

let forceSwapToastTimeout: ReturnType<typeof setTimeout> | null = null;

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

export function scheduleForceSwapToast() {
    clearForceSwapToast();
    const state = getForcedSwapState();
    if (!state?.active) return;

    const remaining = state.endTimeMs - Date.now();
    if (remaining <= 0) {
        showToast(`Force swap with ${state.targetUsername} has expired.`);
        return;
    }

    forceSwapToastTimeout = setTimeout(() => {
        showToast(`Force swap with ${state.targetUsername} has expired.`);
        forceSwapToastTimeout = null;
    }, remaining);
}

export function clearForceSwapToast() {
    if (forceSwapToastTimeout !== null) {
        clearTimeout(forceSwapToastTimeout);
        forceSwapToastTimeout = null;
    }
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

    scheduleForceSwapToast();
}

export function cancelForcedSwap() {
    clearForceSwapToast();
    storage.forcedSwap = undefined;
    cleanupAllPending();
}
