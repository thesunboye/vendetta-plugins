import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { ApplicationCommandInputType, ApplicationCommandType, ClydeUtils } from "../types";
import { ensureInDMs } from "../utils/ui";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;

export function createWhitelistAddCommand() {
    return registerCommand({
        name: "swap-whitelist-add",
        displayName: "swap-whitelist-add",
        description: "Add a user to the swap whitelist.",
        displayDescription: "Add a user to the swap whitelist.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            try {
                const userToWhitelist = ensureInDMs(ctx);
                if (!userToWhitelist) return;

                if (!storage.whitelist.includes(userToWhitelist.id)) {
                    storage.whitelist.push(userToWhitelist.id);
                    sendBotMessage(ctx.channel.id, `Added <@${userToWhitelist.id}> to the whitelist! You will no longer see swap confirmation prompts from them.`);
                } else {
                    sendBotMessage(ctx.channel.id, `<@${userToWhitelist.id}> is already whitelisted.`);
                }
            } catch (err) {
                console.error("Error in whitelist-add command:", err);
                sendBotMessage(ctx.channel.id, `❌ **Whitelist Add Failed**: ${err.stack ?? err.message ?? 'Unknown error occurred'}.`);
            }
        },
    });
}

export function createWhitelistRemoveCommand() {
    return registerCommand({
        name: "swap-whitelist-remove",
        displayName: "swap-whitelist-remove",
        description: "Remove a user from the swap whitelist.",
        displayDescription: "Remove a user from the swap whitelist.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            const userToRemove = ensureInDMs(ctx);
            if (!userToRemove) return;

            if (storage.whitelist.includes(userToRemove.id)) {
                storage.whitelist = storage.whitelist.filter(id => id !== userToRemove.id);
                sendBotMessage(ctx.channel.id, `Removed <@${userToRemove.id}> from the whitelist.`);
            } else {
                sendBotMessage(ctx.channel.id, `<@${userToRemove.id}> is not in the whitelist.`);
            }
        },
    });
}

export function createWhitelistListCommand() {
    return registerCommand({
        name: "swap-whitelist-list",
        displayName: "swap-whitelist-list",
        description: "List all whitelisted users.",
        displayDescription: "List all whitelisted users.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            if (storage.whitelist.length === 0) {
                sendBotMessage(ctx.channel.id, "No users are currently whitelisted.");
            } else {
                const userList = storage.whitelist.map(id => `<@${id}>`).join(', ');
                sendBotMessage(ctx.channel.id, `Whitelisted users: ${userList}`);
            }
        },
    });
}

export function createWhitelistClearCommand() {
    return registerCommand({
        name: "swap-whitelist-clear",
        displayName: "swap-whitelist-clear",
        description: "Clears the swap whitelist.",
        displayDescription: "Clears the swap whitelist.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            storage.whitelist = [];
            sendBotMessage(ctx.channel.id, "Whitelist cleared!");
        },
    });
}
