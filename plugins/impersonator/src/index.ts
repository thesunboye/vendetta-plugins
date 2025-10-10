import { createAllCommands } from "./commands";
import { createUserPatches } from "./patches/user";
import { createMessagePatch } from "./patches/message";
import { initStorage } from "./storage";
import { cleanupAll } from "./utils/cleanup";

const patches: (() => void)[] = [];

function onLoad() {
    initStorage();
    
    patches.push(...createUserPatches());
    patches.push(createMessagePatch());
    patches.push(...createAllCommands());
}

function onUnload() {
    patches.forEach(p => p());
    patches.length = 0;
    
    cleanupAll();
}

export default { onUnload, onLoad };
