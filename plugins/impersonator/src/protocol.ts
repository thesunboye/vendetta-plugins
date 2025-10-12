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

const MAGIC = "🦝";

// Aggressive LZ77-style compression
function compress(str: string): string {
    // First pass: dictionary compression for common patterns
    const dict: [string, string][] = [
        ['targetUserId', '\x01'],
        ['avatarSource', '\x02'],
        ['avatarURL', '\x03'],
        ['profile', '\x04'],
        ['user', '\x05'],
        ['COMMIT_PROFILE', '\x06'],
        ['COMMIT_ACCEPT', '\x07'],
        ['CLEAR_USER', '\x08'],
        ['CLEAR_ALL', '\x09'],
        ['"$":', '\x0A'],
        ['":"', '\x0B'],
        ['","', '\x0C'],
        ['":', '\x0D'],
        [',"', '\x0E'],
        ['{"', '\x0F'],
        ['"}', '\x10'],
        ['":{"', '\x11'],
        ['},"', '\x12'],
    ];
    
    let result = str;
    for (const [key, val] of dict) {
        result = result.split(key).join(val);
    }
    
    // Second pass: LZ77-style back-reference compression
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
    
    let result = output.join('');
    
    // Second pass: expand dictionary
    const dict: [string, string][] = [
        ['\x01', 'targetUserId'],
        ['\x02', 'avatarSource'],
        ['\x03', 'avatarURL'],
        ['\x04', 'profile'],
        ['\x05', 'user'],
        ['\x06', 'COMMIT_PROFILE'],
        ['\x07', 'COMMIT_ACCEPT'],
        ['\x08', 'CLEAR_USER'],
        ['\x09', 'CLEAR_ALL'],
        ['\x0A', '"$":'],
        ['\x0B', '":"'],
        ['\x0C', '","'],
        ['\x0D', '":'],
        ['\x0E', ',"'],
        ['\x0F', '{"'],
        ['\x10', '"}'],
        ['\x11', '":{"'],
        ['\x12', '},"'],
    ];
    
    for (const [key, val] of dict) {
        result = result.split(key).join(val);
    }
    
    return result;
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
