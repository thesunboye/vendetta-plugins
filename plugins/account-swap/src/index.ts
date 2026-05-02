import { storage } from "@vendetta/plugin";
import { createMessagePatch } from "./patches/message";
import { createExperimentPatch } from "./patches/experiment";
import { createAllCommands } from "./commands";
import { cleanupAll } from "./utils/cleanup";

const patches: (() => void)[] = [];

function onLoad() {
    storage.whitelist ??= [];
    storage.acceptFromEveryone ??= false;
    storage.possessAcceptMode ??= "none";

    patches.push(createExperimentPatch());
    patches.push(createMessagePatch());

    patches.push(...createAllCommands());
}

function onUnload() {
    patches.forEach(p => p());
    patches.length = 0;
    
    cleanupAll();
}

export default { onUnload, onLoad };
