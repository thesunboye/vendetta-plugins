import { storage } from "@vendetta/plugin";
import { findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";

export interface UserReplacement {
    id: string;
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

/**
 * Helper to update a replacement and ensure storage is synced.
 * Vendetta's storage system requires reassignment to detect changes.
 */
export function setReplacement(userId: string, data: UserReplacementData) {
    typedStorage.replacements = {
        ...typedStorage.replacements,
        [userId]: data
    };
}

/**
 * Helper to delete a replacement and ensure storage is synced.
 */
export function deleteReplacement(userId: string) {
    const { [userId]: _, ...rest } = typedStorage.replacements;
    typedStorage.replacements = rest;
}

/**
 * Helper to clear all replacements and ensure storage is synced.
 */
export function clearAllReplacements() {
    typedStorage.replacements = {};
}

/**
 * Force Discord to refresh all cached user data for a specific user.
 * This ensures the UI updates immediately after changing replacements.
 */
export function forceUserRefresh(userId: string) {
    if (!FluxDispatcher?.dispatch) return;
    
    const UserStore = findByStoreName("UserStore");
    const user = UserStore?.getUser?.(userId);
    
    if (!user) return;
    
    // Dispatch multiple events to force complete UI refresh
    // USER_UPDATE: Updates username, avatar, discriminator, etc.
    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: { ...user }
    });
    
    // USER_PROFILE_UPDATE: Forces profile modal to refresh
    FluxDispatcher.dispatch({
        type: "USER_PROFILE_UPDATE",
        user: { ...user },
        guildId: undefined
    });
    
    // PRESENCE_UPDATE: Forces presence indicators to refresh
    FluxDispatcher.dispatch({
        type: "PRESENCE_UPDATE",
        user: { ...user }
    });
    
    // Force a small delay then another USER_UPDATE to ensure persistence
    setTimeout(() => {
        if (FluxDispatcher?.dispatch) {
            FluxDispatcher.dispatch({
                type: "USER_UPDATE",
                user: { ...user }
            });
        }
    }, 100);
}
