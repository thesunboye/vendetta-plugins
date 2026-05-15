import { registerCommand } from "@vendetta/commands";
import { findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils } from "../types";
import { findByProps } from "@vendetta/metro";
import { setReplacement, UserReplacementData } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");

export function createJsonProfileCommand() {
    return registerCommand({
        name: "impersonate-json-profile",
        displayName: "impersonate-json-profile",
        description: "Apply a custom profile from JSON data (user data and/or profile config).",
        displayDescription: "Apply a custom profile from JSON data (user data and/or profile config).",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "json",
                displayName: "json",
                description: "JSON object with user and/or profile properties",
                displayDescription: "JSON object with user and/or profile properties",
                type: ApplicationCommandOptionType.STRING as number,
                required: true,
            },
            {
                name: "target",
                displayName: "target",
                description: "Target user to apply profile to (defaults to yourself)",
                displayDescription: "Target user to apply profile to (defaults to yourself)",
                type: ApplicationCommandOptionType.USER as number,
                required: false,
            }
        ],
        async execute(args, ctx) {
            const currentUser = UserStore.getCurrentUser();
            const jsonString = args[0]?.value;
            const targetUserId = args[1]?.value?.id || args[1]?.value || currentUser?.id;

            if (!currentUser) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not get your user.");
            }

            if (!jsonString) {
                return sendBotMessage(ctx.channel.id, "Failed: No JSON data provided.");
            }

            let data: any;
            try {
                data = JSON.parse(jsonString);
            } catch (e) {
                return sendBotMessage(ctx.channel.id, `Failed: Invalid JSON - ${(e as Error).message}`);
            }

            if (!data || (typeof data !== "object")) {
                return sendBotMessage(ctx.channel.id, "Failed: JSON must be an object.");
            }

            // Validate that at least user or profile data is present
            if (!data.user && !data.profile) {
                return sendBotMessage(ctx.channel.id, "Failed: JSON must contain 'user' and/or 'profile' properties.");
            }

            const targetUser = UserStore.getUser(targetUserId);
            if (!targetUser && targetUserId !== currentUser.id) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not find target user.");
            }

            // Build replacement data from JSON
            const replacementData: UserReplacementData = {
                user: data.user,
                profile: data.profile,
                avatarURL: data.avatarURL,
                avatarSource: data.avatarSource,
            };

            // Apply the replacement
            setReplacement(targetUserId, replacementData);

            const isSelf = targetUserId === currentUser.id;
            const targetName = isSelf ? "yourself" : (targetUser?.username || "unknown user");
            
            sendBotMessage(ctx.channel.id, `✨ Successfully applied custom JSON profile to ${targetName} (local only)!`);
        },
    });
}
