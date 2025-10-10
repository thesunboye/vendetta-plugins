import * as encoding from "./3y3";

export type ProtocolMessage =
    | Message<"COMMIT_PROFILE"> & { 
        targetUserId: string;
        user?: any;
        profile?: any;
        avatarURL?: string;
        avatarSource?: any;
    }
    | Message<"COMMIT_ACCEPT"> & {
        targetUserId: string;
    }
    | Message<"CLEAR_USER"> & {
        targetUserId: string;
    }
    | Message<"CLEAR_ALL">;

export type Message<T extends string> = {
    $: T;
};

const MAGIC = "🦝🎭";

export function encodeMessage(message: ProtocolMessage): string {
    const json = JSON.stringify(message);
    return MAGIC + encoding.encode(json);
}

export function decodeMessage(str: string): ProtocolMessage | null {
    // Check if the string starts with our magic prefix
    if (!str.startsWith(MAGIC)) return null;
    
    // Remove the prefix and decode
    const encodedPart = str.slice(MAGIC.length);
    const decoded = encoding.decode(encodedPart);
    if (!decoded) return null;

    try {
        return JSON.parse(decoded) as ProtocolMessage;
    } catch {
        return null;
    }
}
