import { createSwapCommand } from "./swap";
import { createWhitelistAddCommand, createWhitelistRemoveCommand, createWhitelistListCommand, createWhitelistClearCommand } from "./whitelist";
import { createPossessInviteCommand, createPossessRequestCommand } from "./possession";
import { 
    createAcceptEveryoneEnableCommand, 
    createAcceptEveryoneDisableCommand, 
    createAcceptEveryoneStatusCommand,
    createPossessAcceptModeCommand,
    createPossessAcceptModeStatusCommand
} from "./settings";
import { createForceSwapCommand, createForceCancelCommand, createForceStatusCommand } from "./force";

/**
 * Creates and returns all command patches
 */
export function createAllCommands() {
    return [
        // Core commands
        createSwapCommand(),
        
        // Force swap commands
        createForceSwapCommand(),
        createForceCancelCommand(),
        createForceStatusCommand(),
        
        // Whitelist commands
        createWhitelistAddCommand(),
        createWhitelistRemoveCommand(),
        createWhitelistListCommand(),
        createWhitelistClearCommand(),
        
        // Possession commands
        createPossessInviteCommand(),
        createPossessRequestCommand(),
        
        // Settings commands
        createAcceptEveryoneEnableCommand(),
        createAcceptEveryoneDisableCommand(),
        createAcceptEveryoneStatusCommand(),
        createPossessAcceptModeCommand(),
        createPossessAcceptModeStatusCommand(),
    ];
}
