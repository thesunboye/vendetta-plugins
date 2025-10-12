import { getBuffer, type UserReplacementData } from "../storage";

/**
 * Fixes up profile data after deserialization from JSON storage.
 * Date objects become strings in JSON, so we need to convert them back.
 */
export function getApplyData(): UserReplacementData {
    const buffer = getBuffer();
    if (!buffer) return {};

    const applyData: UserReplacementData = {
        user: buffer.user ? { ...buffer.user } : undefined,
        profile: buffer.profile ? { ...buffer.profile } : undefined,
        avatarURL: buffer.avatarURL,
        avatarSource: buffer.avatarSource,
    };

    // Fix Date properties that became strings during JSON serialization
    if (applyData.profile) {
        if (applyData.profile.premiumSince) {
            applyData.profile.premiumSince = new Date();
        }
        if (applyData.profile.premiumGuildSince) {
            applyData.profile.premiumGuildSince = new Date();
        }
    }

    return applyData;
}