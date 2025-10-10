import { createCopyCommand } from "./copy";
import { createApplyCommand } from "./apply";
import { createClearUserCommand, createClearAllCommand } from "./clear";
import { createBufferInfoCommand, createBufferClearCommand } from "./buffer";
import { createListCommand } from "./list";

export const createAllCommands = () => ([
    createCopyCommand(),
    createApplyCommand(),
    createClearUserCommand(),
    createClearAllCommand(),
    createBufferInfoCommand(),
    createBufferClearCommand(),
    createListCommand(),
]);