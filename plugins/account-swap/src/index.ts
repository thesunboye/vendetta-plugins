import { storage } from "@vendetta/plugin";
import { createMessagePatch } from "./patches/message";
import { createAllCommands } from "./commands";
import { cleanupAll } from "./utils/cleanup";

// Store all patches for cleanup
const patches: (() => void)[] = [];

function onLoad() {
    // Initialize storage
    storage.whitelist ??= [];
    storage.acceptFromEveryone ??= false;
    storage.possessAcceptFromEveryone ??= false;

    // Register message protocol patch
    patches.push(createMessagePatch());

    // Register all commands
    patches.push(...createAllCommands());
}

function onUnload() {
    // Clean up all patches
    patches.forEach(p => p());
    patches.length = 0;
    
    // Clean up all pending operations
    cleanupAll();
}

export default { onUnload, onLoad };
