import { findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";

/**
 * Forces the multi-account mobile experiment to always be enabled.
 * This makes the native account switcher UI available regardless of server-side experiment assignment.
 */
export function createExperimentPatch() {
    const MultiAccountStore = findByStoreName("MultiAccountStore");
    if (!MultiAccountStore) {
        console.warn("[account-swap] MultiAccountStore not found, cannot force-enable experiment.");
        return () => {};
    }

    return instead("getCanUseMultiAccountMobile", MultiAccountStore, () => true);
}
