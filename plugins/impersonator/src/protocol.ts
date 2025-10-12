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
    | Message<"CLEAR_ALL">
    | Message<"CHUNK"> & {
        chunkId: string;
        index: number;
        total: number;
        data: string;
    };

export type Message<T extends string> = {
    $: T;
};

const MAGIC = "🦝";

// Aggressive LZ77-style compression
function compress(str: string): string {
    // LZ77-style back-reference compression
    const result = str;
    const output: string[] = [];
    let i = 0;
    
    while (i < result.length) {
        let bestLen = 0;
        let bestDist = 0;
        
        // Look for matches in the previous 255 characters
        const searchStart = Math.max(0, i - 255);
        for (let j = searchStart; j < i; j++) {
            let len = 0;
            while (i + len < result.length && result[j + len] === result[i + len] && len < 255) {
                len++;
            }
            if (len > bestLen && len >= 3) {
                bestLen = len;
                bestDist = i - j;
            }
        }
        
        if (bestLen >= 3) {
            // Encode as reference: special marker + distance + length
            output.push('\x13', String.fromCharCode(bestDist), String.fromCharCode(bestLen));
            i += bestLen;
        } else {
            output.push(result[i]);
            i++;
        }
    }
    
    return output.join('');
}

function decompress(str: string): string {
    // First pass: expand LZ77 back-references
    const output: string[] = [];
    let i = 0;
    
    while (i < str.length) {
        if (str[i] === '\x13' && i + 2 < str.length) {
            // Back-reference
            const dist = str.charCodeAt(i + 1);
            const len = str.charCodeAt(i + 2);
            
            for (let j = 0; j < len; j++) {
                // Recalculate position for each character to handle overlapping patterns
                output.push(output[output.length - dist]);
            }
            i += 3;
        } else {
            output.push(str[i]);
            i++;
        }
    }
    
    return output.join('');
}

export function encodeMessage(message: ProtocolMessage): string {
    const json = JSON.stringify(message);
    const compressed = compress(json);
    return MAGIC + encoding.encode(compressed);
}

export function decodeMessage(str: string): ProtocolMessage | null {
    // Check if the string starts with our magic prefix
    if (!str.startsWith(MAGIC)) return null;
    
    // Remove the prefix and decode
    const encodedPart = str.slice(MAGIC.length);
    const decoded = encoding.decode(encodedPart);
    if (!decoded) return null;

    try {
        const decompressed = decompress(decoded);
        return JSON.parse(decompressed) as ProtocolMessage;
    } catch {
        return null;
    }
}

// Simple chunking: split encoded message into chunks that fit Discord's 2000 char limit
const MAX_CHUNK_SIZE = 1800; // Leave room for magic prefix and encoding overhead

export function chunkMessage(message: ProtocolMessage): string[] {
    const encoded = encodeMessage(message);
    
    // If it fits in one message, return as-is
    if (encoded.length <= MAX_CHUNK_SIZE) {
        return [encoded];
    }
    
    // Generate a unique ID for this chunk set
    const chunkId = Math.random().toString(36).substring(2, 10);
    const json = JSON.stringify(message);
    const chunks: string[] = [];
    const chunkDataSize = MAX_CHUNK_SIZE - 200; // Reserve space for chunk metadata
    
    const totalChunks = Math.ceil(json.length / chunkDataSize);
    
    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkDataSize;
        const end = Math.min(start + chunkDataSize, json.length);
        const chunkData = json.substring(start, end);
        
        const chunk: ProtocolMessage = {
            $: "CHUNK",
            chunkId,
            index: i,
            total: totalChunks,
            data: chunkData,
        };
        
        chunks.push(encodeMessage(chunk));
    }
    
    return chunks;
}
