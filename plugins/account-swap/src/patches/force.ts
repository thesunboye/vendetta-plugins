import { findByProps, findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { showCustomAlert } from "@vendetta/ui/alerts";
import { Alert } from "@vendetta/ui/components";
import { cancelForcedSwap, getForcedSwapState } from "../core/force";

const UserStore = findByStoreName("UserStore");

export function createLogoutPatch() {
    const authModule = findByProps("login", "logout", "switchAccountToken");
    if (!authModule?.logout) {
        console.warn("[account-swap] Logout function not found, cannot patch.");
        return () => {};
    }

    return instead("logout", authModule, (args, origFunc) => {
        const state = getForcedSwapState();
        if (!state?.active) return origFunc(...args);

        showCustomAlert(Alert, {
            title: "Cannot Logout",
            content: `Logout is disabled during a forced swap with **${state.targetUsername}**.`,
        });
    });
}

export function createDisplayNamePatch() {
    if (!UserStore?.getUser) {
        console.warn("[account-swap] UserStore.getUser not found, cannot patch display name.");
        return () => {};
    }

    return instead("getUser", UserStore, (args, origFunc) => {
        const result = origFunc(...args);
        if (!result || typeof result !== "object") return result;

        const state = getForcedSwapState();
        if (!state?.active) return result;
        if (Date.now() >= state.endTimeMs) {
            cancelForcedSwap();
            return result;
        }

        const userId = args[0];
        if (userId === state.targetUserId || userId === state.originalUserId) {
            const original = result.globalName || result.username || "";
            if (!original.startsWith("🔒 ")) {
                result.globalName = "🔒 " + original;
            }
        }

        return result;
    });
}

export function createForcePatches() {
    return [
        createLogoutPatch(),
        createDisplayNamePatch(),
    ];
}
