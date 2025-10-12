import { findByProps } from "@vendetta/metro";
import { before, instead } from "@vendetta/patcher";
import { getReplacement } from "../storage";

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

                const replacementData = getReplacement(result.id);
                const replacement = replacementData?.user;

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

                const replacementData = getReplacement(args[0]);
                const replacement = replacementData?.profile;
                return replacement ? { ...replacement } : ogFunc(...args);
            })
        );
    }

    if (avatarStuff?.getUserAvatarURL) {
        patches.push(
            instead("getUserAvatarURL", avatarStuff, (args, ogFunc) => {
                if (typeof ogFunc !== "function") return null;
                
                const userId = args?.[0]?.id;
                if (userId) {
                    const replacementData = getReplacement(userId);
                    const url = replacementData?.avatarURL;
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
                    const replacementData = getReplacement(userId);
                    const source = replacementData?.avatarSource;
                    if (source) return source;
                }
                return ogFunc(...args);
            })
        );
    }

    if (SnowflakeUtils?.extractTimestamp) {
        patches.push(before("extractTimestamp", SnowflakeUtils, (args) => {
            const replacementData = getReplacement(args[0]);
            const replacement = replacementData?.user;

            if (replacement) args[0] = replacement.id;

            return args;
        }));
    }

    return patches;
};