import { storage } from "@vendetta/plugin";
import { encodeMessage, decodeMessage } from "./protocol";

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

export interface BufferData {
    user?: any;
    profile?: any;
    avatarURL?: string;
    avatarSource?: any;
    sourceUsername?: string;
    timestamp?: number;
}

export interface ImpersonatorStorage {
    // Store as encoded protocol messages for compression and consistency
    replacements: Record<string, string>;
    // Store buffer as encoded protocol message as well
    buffer?: string;
}

export const typedStorage = storage as unknown as ImpersonatorStorage;

export function initStorage() {
    // Initialize replacements if missing
    if (!typedStorage.replacements) {
        typedStorage.replacements = {};
    }
    
    // Check if replacements contain old object-based format and reset if needed
    for (const [_userId, value] of Object.entries(typedStorage.replacements)) {
        if (typeof value !== 'string') {
            // Old format detected, reset storage
            typedStorage.replacements = {};
            break;
        }
    }
    
    // Check if buffer is in old object-based format and reset if needed
    if (typedStorage.buffer && typeof typedStorage.buffer !== 'string') {
        typedStorage.buffer = undefined;
    }
}

/**
 * Helper to update a replacement and ensure storage is synced.
 * Vendetta's storage system requires reassignment to detect changes.
 * Now stores data as encoded protocol messages for compression.
 */
export function setReplacement(userId: string, data: UserReplacementData) {
    // Encode the data as a COMMIT_PROFILE protocol message
    const encoded = encodeMessage({
        $: "COMMIT_PROFILE",
        targetUserId: userId,
        user: data.user,
        profile: data.profile,
        avatarURL: data.avatarURL,
        avatarSource: data.avatarSource,
    });
    
    typedStorage.replacements = {
        ...typedStorage.replacements,
        [userId]: encoded
    };
}

/**
 * Helper to get a replacement from storage.
 * Decodes the protocol message back to UserReplacementData.
 */
export function getReplacement(userId: string): UserReplacementData | undefined {
    const encoded = typedStorage.replacements?.[userId];
    if (!encoded) return undefined;
    
    const decoded = decodeMessage(encoded);
    if (!decoded || decoded.$ !== "COMMIT_PROFILE") return undefined;
    
    return {
        user: decoded.user,
        profile: decoded.profile,
        avatarURL: decoded.avatarURL,
        avatarSource: decoded.avatarSource,
    };
}

/**
 * Helper to get all replacements as a map of userId -> UserReplacementData.
 */
export function getAllReplacements(): Record<string, UserReplacementData> {
    const result: Record<string, UserReplacementData> = {};
    
    for (const userId of Object.keys(typedStorage.replacements || {})) {
        const data = getReplacement(userId);
        if (data) {
            result[userId] = data;
        }
    }
    
    return result;
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
 * Now stores as encoded protocol message for compression.
 */
export function setBuffer(bufferData: BufferData) {
    if (!bufferData || (!bufferData.user && !bufferData.profile)) {
        // Clear buffer if empty
        typedStorage.buffer = undefined;
        return;
    }
    
    // Encode the buffer as a COMMIT_PROFILE protocol message
    // We use a dummy targetUserId since buffer is not yet assigned to a user
    const encoded = encodeMessage({
        $: "COMMIT_PROFILE",
        targetUserId: "_buffer_",
        user: bufferData.user,
        profile: bufferData.profile,
        avatarURL: bufferData.avatarURL,
        avatarSource: bufferData.avatarSource,
    });
    
    // Store metadata separately (not part of protocol message)
    const metadata = {
        sourceUsername: bufferData.sourceUsername,
        timestamp: bufferData.timestamp,
    };
    
    // Encode with metadata appended as JSON
    typedStorage.buffer = encoded + "|" + JSON.stringify(metadata);
}

/**
 * Helper to get buffer data from storage.
 * Decodes the protocol message back to BufferData.
 */
export function getBuffer(): BufferData | undefined {
    const stored = typedStorage.buffer;
    if (!stored) return undefined;
    
    // Split encoded message and metadata
    const [encoded, metadataStr] = stored.split("|");
    
    const decoded = decodeMessage(encoded);
    if (!decoded || decoded.$ !== "COMMIT_PROFILE") return undefined;
    
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    
    return {
        user: decoded.user,
        profile: decoded.profile,
        avatarURL: decoded.avatarURL,
        avatarSource: decoded.avatarSource,
        sourceUsername: metadata.sourceUsername,
        timestamp: metadata.timestamp,
    };
}
