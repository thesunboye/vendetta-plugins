import { findByStoreName } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { isForcedSwapActive } from "../core/force";

/**
 * Forces the multi-account mobile experiment to always be enabled,
 * unless a forced swap is active (in which case multi-account is disabled).
 */
export function createExperimentPatch() {
    const MultiAccountStore = findByStoreName("MultiAccountStore");
    if (!MultiAccountStore) {
        console.warn("[account-swap] MultiAccountStore not found, cannot force-enable experiment.");
        return () => {};
    }

    return instead("getCanUseMultiAccountMobile", MultiAccountStore, (args, origFunc) => {
        if (isForcedSwapActive()) return false;
        return true;
    });
}
