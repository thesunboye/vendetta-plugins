export const pendingCommits = new Map<string, any>();

export const cleanupAll = () => {
    pendingCommits.clear();
};
