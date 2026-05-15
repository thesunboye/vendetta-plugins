import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandType, ClydeUtils } from "../types";
import { getAllReplacements } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");

export function createListCommand() {
    return registerCommand({
        name: "impersonate-list",
        displayName: "impersonate-list",
        description: "List all active profile replacements.",
        displayDescription: "List all active profile replacements.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            const replacements = getAllReplacements();
            const count = replacements.size;

            if (count === 0) {
                return sendBotMessage(ctx.channel.id, "No active profile replacements.");
            }

            let message = `Active Profile Replacements (${count})\n\n`;

            for (const [userId, replacement] of replacements) {
                const user = UserStore.getUser(userId);
                const username = user?.username || "Unknown User";
                
                const hasUser = !!replacement.user;
                const hasProfile = !!replacement.profile;
                const hasAvatar = !!(replacement.avatarURL || replacement.avatarSource);

                message += `<@${userId}> (${username})\n`;
                message += `  User: ${hasUser ? "Yes" : "No"} | Profile: ${hasProfile ? "Yes" : "No"} | Avatar: ${hasAvatar ? "Yes" : "No"}\n`;
            }

            sendBotMessage(ctx.channel.id, message);
        },
    });
}
