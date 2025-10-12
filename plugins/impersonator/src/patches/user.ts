import { findByProps } from "@vendetta/metro";
import { before, instead } from "@vendetta/patcher";
import { typedStorage } from "../storage";

const UserStore = findByProps("getUser");
const UserProfileStore = findByProps("getUserProfile");
const avatarStuff = findByProps("getUserAvatarURL", "getUserAvatarSource");
const SnowflakeUtils = findByProps("extractTimestamp");

export const createUserPatches = () => {
    const patches = [];

    if (UserStore?.getUser) {
        patches.push(
            instead("getUser", UserStore, (args, ogFunc) => {
                let result = ogFunc(...args);

                if (!result || typeof result != "object") {
                    return result;
                }

                const replacement = typedStorage.replacements[result.id]?.user;

                if (replacement) {
                    for (const [k, v] of Object.entries(replacement)) {
                        if (
                            [
                                "mfaEnabled",
                                "email",
                                "nsfwAllowed",
                                "ageVerificationStatus",
                                "verified",
                                "phone",
                                "id",
                            ].includes(k)
                        )
                            continue;

                        result[k] = v;
                    }
                }

                return result;
            }),
        );
    }

    if (UserProfileStore?.getUserProfile) {
        patches.push(
            instead("getUserProfile", UserProfileStore, (args, ogFunc) => {
                if (typeof ogFunc !== "function" || !args?.[0]) return ogFunc?.(...args) || null;

                const userId = args[0];
                const replacement = typedStorage.replacements?.[userId]?.profile;
                
                if (!replacement) {
                    return ogFunc(...args);
                }

                // Get the original profile first
                const originalProfile = ogFunc(...args);
                
                // If there's no original profile, return just the replacement
                if (!originalProfile || typeof originalProfile !== "object") {
                    return { ...replacement };
                }

                // Merge replacement ON TOP of original profile to preserve all data
                return {
                    ...originalProfile,
                    ...replacement
                };
            })
        );
    }

    if (avatarStuff?.getUserAvatarURL) {
        patches.push(
            instead("getUserAvatarURL", avatarStuff, (args, ogFunc) => {
                if (typeof ogFunc !== "function") return null;
                
                const userId = args?.[0]?.id;
                if (userId) {
                    const url = typedStorage.replacements?.[userId]?.avatarURL;
                    if (url) return url;
                }
                return ogFunc(...args);
            })
        );
    }

    if (avatarStuff?.getUserAvatarSource) {
        patches.push(
            instead("getUserAvatarSource", avatarStuff, (args, ogFunc) => {
                if (typeof ogFunc !== "function") return null;
                
                const userId = args?.[0]?.id;
                if (userId) {
                    const source = typedStorage.replacements?.[userId]?.avatarSource;
                    if (source) return source;
                }
                return ogFunc(...args);
            })
        );
    }

    if (SnowflakeUtils?.extractTimestamp) {
        patches.push(before("extractTimestamp", SnowflakeUtils, (args) => {
            const replacement = typedStorage.replacements?.[args[0]]?.user;

            if (replacement) args[0] = replacement.id;

            return args;
        }));
    }

    return patches;
};