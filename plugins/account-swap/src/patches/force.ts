import { findByProps, findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
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

        showConfirmationAlert({
            title: "🔒 Force Swap Active",
            content: `Logout is disabled during a forced swap with **${state.targetUsername}**. To regain full control of your account, use the \`/force-cancel\` command to end the forced swap first.`,
            confirmText: "Okay",
            onConfirm: () => {},
            cancelText: "Force Logout (Emergency)",
            onCancel: () => {
                showConfirmationAlert({
                    title: "⚠️ Final Warning",
                    content: `Forced logout will end the forced swap with **${state.targetUsername}** immediately. Are you absolutely sure?`,
                    confirmText: "Yes, force logout",
                    confirmColor: "red" as any,
                    onConfirm: () => {
                        cancelForcedSwap();
                        origFunc(...args);
                    },
                    cancelText: "Go back",
                    onCancel: () => {},
                });
            },
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
