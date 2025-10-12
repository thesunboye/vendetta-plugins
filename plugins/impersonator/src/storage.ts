import { storage } from "@vendetta/plugin";

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
 * Also deep-clones nested objects to avoid mutation issues.
 */
export function setReplacement(userId: string, data: UserReplacementData) {
    // Deep clone the data to avoid mutation issues and ensure proper JSON serialization
    const clonedData: UserReplacementData = {
        user: data.user ? { ...data.user } : undefined,
        profile: data.profile ? { ...data.profile } : undefined,
        avatarURL: data.avatarURL,
        avatarSource: data.avatarSource,
    };
    
    // Fix Date properties that became strings during JSON serialization
    if (clonedData.profile) {
        if (clonedData.profile.premiumSince) {
            clonedData.profile.premiumSince = new Date();
        }
        if (clonedData.profile.premiumGuildSince) {
            clonedData.profile.premiumGuildSince = new Date();
        }
    }
    
    typedStorage.replacements = {
        ...typedStorage.replacements,
        [userId]: clonedData
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
 * Helper to set buffer data and ensure storage is synced.
 * Properly handles object reassignment for Vendetta's storage system.
 */
export function setBuffer(bufferData: ImpersonatorStorage["buffer"]) {
    const clonedBuffer = { ...bufferData };
    
    // Fix Date properties that became strings during JSON serialization
    if (clonedBuffer?.profile) {
        if (clonedBuffer.profile.premiumSince) {
            clonedBuffer.profile.premiumSince = new Date();
        }
        if (clonedBuffer.profile.premiumGuildSince) {
            clonedBuffer.profile.premiumGuildSince = new Date();
        }
    }
    
    typedStorage.buffer = clonedBuffer;
}
