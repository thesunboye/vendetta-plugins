export const pendingCommits = new Map<string, any>();

// In-memory caches for decoded data to reduce decode operations
export const replacementCache = new Map<string, any>();
export const bufferCache = new Map<string, any>();

export const cleanupAll = () => {
    pendingCommits.clear();
    replacementCache.clear();
    bufferCache.clear();
};
