import { storage } from "@vendetta/plugin";

export interface UserReplacement {
    username?: string;
    discriminator?: string;
    avatar?: string;
    banner?: string;
    bio?: string;
    globalName?: string;
    avatarDecoration?: string;
}

export interface ProfileReplacement {
    bio?: string;
    pronouns?: string;
    themeColors?: [number, number];
    banner?: string;
    accentColor?: number;
    badges?: any[];
    premiumType?: number;
    premiumSince?: Date | string;
    premiumGuildSince?: Date | string;
}

export interface AvatarInfo {
    avatarURL?: string;
    avatarSource?: any;
}

export interface UserReplacementData {
    user?: UserReplacement;
    profile?: ProfileReplacement;
    avatarURL?: string;
    avatarSource?: any;
}

export interface ImpersonatorStorage {
    replacements: Record<string, UserReplacementData>;
    buffer?: {
        user?: any;
        profile?: any;
        avatarURL?: string;
        avatarSource?: any;
        sourceUsername?: string;
        timestamp?: number;
    };
}

export const typedStorage = storage as unknown as ImpersonatorStorage;

export function initStorage() {
    if (!typedStorage.replacements) {
        typedStorage.replacements = {};
    }
    if (!typedStorage.buffer) {
        typedStorage.buffer = {};
    }
}
