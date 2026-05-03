import { storage } from "@vendetta/plugin";
import { createMessagePatch } from "./patches/message";
import { createExperimentPatch } from "./patches/experiment";
import { createForcePatches } from "./patches/force";
import { createAllCommands } from "./commands";
import { cleanupAll } from "./utils/cleanup";
import { scheduleForceSwapToast, clearForceSwapToast } from "./core/force";

const patches: (() => void)[] = [];

function onLoad() {
    storage.whitelist ??= [];
    storage.acceptFromEveryone ??= false;
    storage.possessAcceptMode ??= "none";

    patches.push(createExperimentPatch());
    patches.push(createMessagePatch());
    patches.push(...createForcePatches());

    patches.push(...createAllCommands());

    scheduleForceSwapToast();
}

function onUnload() {
    patches.forEach(p => p());
    patches.length = 0;

    clearForceSwapToast();
    cleanupAll();
}

export default { onUnload, onLoad };
