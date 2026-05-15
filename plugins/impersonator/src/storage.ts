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

// In-memory cache to avoid repeated decode operations
const replacementCache = new Map<string, UserReplacementData | null>();
let bufferCache: BufferData | undefined | null = undefined; // null = not loaded yet

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
    
    // Clear caches on init
    replacementCache.clear();
    bufferCache = undefined;
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
    
    // Update cache with the data (no clone needed, references are safe)
    replacementCache.set(userId, data);
}

/**
 * Helper to get a replacement from storage.
 * Uses in-memory cache to avoid repeated decodings.
 */
export function getReplacement(userId: string): UserReplacementData | undefined {
    // Check cache first
    if (replacementCache.has(userId)) {
        const cached = replacementCache.get(userId);
        return cached === null ? undefined : cached;
    }
    
    const encoded = typedStorage.replacements?.[userId];
    if (!encoded) {
        replacementCache.set(userId, null); // Cache miss
        return undefined;
    }
    
    const decoded = decodeMessage(encoded);
    if (!decoded || decoded.$ !== "COMMIT_PROFILE") {
        replacementCache.set(userId, null);
        return undefined;
    }
    
    // Store decoded data directly in cache (no cloning)
    const data: UserReplacementData = {
        user: decoded.user,
        profile: decoded.profile,
        avatarURL: decoded.avatarURL,
        avatarSource: decoded.avatarSource,
    };
    
    replacementCache.set(userId, data);
    return data;
}

/**
 * Helper to get all replacements as a Map (more efficient than object spread).
 */
export function getAllReplacements(): Map<string, UserReplacementData> {
    const result = new Map<string, UserReplacementData>();
    
    for (const userId of Object.keys(typedStorage.replacements || {})) {
        const data = getReplacement(userId);
        if (data) {
            result.set(userId, data);
        }
    }
    
    return result;
}

/**
 * Helper to get all replacements as an object (for backward compatibility).
 */
export function getAllReplacementsAsObject(): Record<string, UserReplacementData> {
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
    
    // Clear from cache
    replacementCache.delete(userId);
}

/**
 * Helper to clear all replacements and ensure storage is synced.
 */
export function clearAllReplacements() {
    typedStorage.replacements = {};
    
    // Clear cache
    replacementCache.clear();
}

/**
 * Helper to set buffer data and ensure storage is synced.
 * Now stores as encoded protocol message for compression.
 */
export function setBuffer(bufferData: BufferData) {
    if (!bufferData || (!bufferData.user && !bufferData.profile)) {
        // Clear buffer if empty
        typedStorage.buffer = undefined;
        bufferCache = undefined; // Clear cache
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
    
    // Update cache with reference (no clone needed)
    bufferCache = bufferData;
}

/**
 * Helper to get buffer data from storage.
 * Uses in-memory cache to avoid repeated decodings.
 */
export function getBuffer(): BufferData | undefined {
    // Return cached buffer if available
    if (bufferCache !== undefined) {
        return bufferCache === null ? undefined : bufferCache;
    }
    
    const stored = typedStorage.buffer;
    if (!stored) {
        bufferCache = null; // Cache miss
        return undefined;
    }
    
    // Split encoded message and metadata
    const [encoded, metadataStr] = stored.split("|");
    
    const decoded = decodeMessage(encoded);
    if (!decoded || decoded.$ !== "COMMIT_PROFILE") {
        bufferCache = null;
        return undefined;
    }
    
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    
    // Store decoded data directly in cache (no cloning)
    const data: BufferData = {
        user: decoded.user,
        profile: decoded.profile,
        avatarURL: decoded.avatarURL,
        avatarSource: decoded.avatarSource,
        sourceUsername: metadata.sourceUsername,
        timestamp: metadata.timestamp,
    };
    
    bufferCache = data;
    return data;
}
