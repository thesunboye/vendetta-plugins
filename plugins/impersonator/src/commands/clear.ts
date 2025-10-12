import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils, MessageModule } from "../types";
import { typedStorage, deleteReplacement, clearAllReplacements } from "../storage";
import { encodeMessage } from "../protocol";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const UserStore = findByStoreName("UserStore");

export function createClearUserCommand() {
    return registerCommand({
        name: "impersonate-clear-user",
        displayName: "impersonate-clear-user",
        description: "Clear the profile replacement for a specified user.",
        displayDescription: "Clear the profile replacement for a specified user.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "user",
                displayName: "user",
                description: "The user to clear the profile for (defaults to yourself)",
                displayDescription: "The user to clear the profile for (defaults to yourself)",
                type: ApplicationCommandOptionType.USER as number,
                required: false,
            },
            {
                name: "local",
                displayName: "local",
                description: "Clear locally without notifying other users",
                displayDescription: "Clear locally without notifying other users",
                type: ApplicationCommandOptionType.BOOLEAN as number,
                required: false,
            }
        ],
        async execute(args, ctx) {
            const currentUser = UserStore.getCurrentUser();
            const userId = args[0]?.value?.id || args[0]?.value || currentUser?.id;

            if (!userId) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not get user.");
            }

            const user = UserStore.getUser(userId);
            if (!user) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not find user.");
            }

            if (!typedStorage.replacements[userId]) {
                const isSelf = userId === currentUser?.id;
                return sendBotMessage(ctx.channel.id, isSelf 
                    ? "No active profile replacement found for yourself."
                    : `No active profile replacement found for ${user.username}.`);
            }

            const isLocal = args[1]?.value === true;
            const isSelf = userId === currentUser?.id;

            deleteReplacement(userId);

            if (isLocal || isSelf) {
                sendBotMessage(ctx.channel.id, isSelf
                    ? "Cleared your profile replacement."
                    : `Cleared profile replacement for ${user.username} locally.`);
            } else {
                if (!ctx.guild && ctx.channel.rawRecipients?.length === 1) {
                    const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                        nonce: Date.now(),
                        content: encodeMessage({
                            $: "CLEAR_USER",
                            targetUserId: userId,
                        }),
                    }, {});

                    setTimeout(() => deleteMessage(ctx.channel.id, messageId).catch(() => {}), 2000);
                }

                sendBotMessage(ctx.channel.id, `Cleared profile replacement for ${user.username}.`);
            }
        },
    });
}

export function createClearAllCommand() {
    return registerCommand({
        name: "impersonate-clear-all",
        displayName: "impersonate-clear-all",
        description: "Clear all profile replacements.",
        displayDescription: "Clear all profile replacements.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "local",
                displayName: "local",
                description: "Clear locally without notifying other users",
                displayDescription: "Clear locally without notifying other users",
                type: ApplicationCommandOptionType.BOOLEAN as number,
                required: false,
            }
        ],
        async execute(args, ctx) {
            const count = Object.keys(typedStorage.replacements).length;
            
            if (count === 0) {
                return sendBotMessage(ctx.channel.id, "No profile replacements to clear.");
            }

            const isLocal = args[0]?.value === true;

            clearAllReplacements();

            if (isLocal) {
                sendBotMessage(ctx.channel.id, `Cleared ${count} profile replacement(s) locally.`);
            } else {
                if (!ctx.guild && ctx.channel.rawRecipients?.length === 1) {
                    const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                        nonce: Date.now(),
                        content: encodeMessage({
                            $: "CLEAR_ALL",
                        }),
                    }, {});

                    setTimeout(() => deleteMessage(ctx.channel.id, messageId).catch(() => {}), 2000);
                }

                sendBotMessage(ctx.channel.id, `Cleared ${count} profile replacement(s).`);
            }
        },
    });
}
