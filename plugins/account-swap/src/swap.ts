import * as encoding from "./3y3";

/**
 * Defines the shape of all possible messages used in the swap protocol.
 * - SWAP_REQUEST: Initiates a swap.
 * - SWAP_CANCEL: Cancels a pending swap.
 * - SWAP_RESPONSE: The receiver's reply, containing their token.
 * - SWAP_FINALIZE: The initiator's final message, containing their token.
 * - POSSESS_INVITE: Invites someone to enter your account (sends your token).
 * - POSSESS_REQUEST: Requests to enter someone else's account.
 * - POSSESS_ACCEPT: Accepts a possession request (sends your token).
 * - POSSESS_CANCEL: Cancels a possession request/invite.
 */
export type SwapMessage =
    | Message<"SWAP_REQUEST">
    | Message<"SWAP_CANCEL">
    | Message<"SWAP_RESPONSE"> & { token: string }
    | Message<"SWAP_FINALIZE"> & { token: string }
    | Message<"POSSESS_INVITE"> & { token: string }
    | Message<"POSSESS_REQUEST">
    | Message<"POSSESS_ACCEPT"> & { token: string }
    | Message<"POSSESS_CANCEL">;

export type Message<T extends string> = {
    $: T;
};

// A unique prefix to identify swap messages.
export const MAGIC = "🐾";

function detect(str: string) {
    return str.startsWith(MAGIC);
}

function decode(str: string) {
    if (!detect(str)) return null;
    return encoding.decode(str.slice(MAGIC.length));
}

function encode(str: string) {
    return MAGIC + encoding.encode(str);
}

/**
 * Encodes a SwapMessage object into a protected string format.
 * @param message The message object to encode.
 * @returns A string ready to be sent.
 */
export function encodeMessage(message: SwapMessage): string {
    return encode(JSON.stringify(message));
}

/**
 * Decodes a string back into a SwapMessage object, if it's a valid message.
 * @param str The raw string from a message.
 * @returns A parsed SwapMessage object or null if invalid.
 */
export function decodeMessage(str: string): SwapMessage | null {
    const decoded = decode(str);
    if (!decoded) return null;

    try {
        return JSON.parse(decoded) as SwapMessage;
    } catch {
        return null;
    }
}
