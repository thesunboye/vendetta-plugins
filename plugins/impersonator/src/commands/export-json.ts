import { registerCommand } from "@vendetta/commands";
import { findByStoreName, findByProps } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils } from "../types";
import { getReplacement } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");
const UserProfileStore = findByProps("getUserProfile");
const avatarStuff = findByProps("getUserAvatarURL", "getUserAvatarSource");

export function createExportJsonCommand() {
    return registerCommand({
        name: "impersonate-export-json",
        displayName: "impersonate-export-json",
        description: "Export a user's profile as JSON (or active replacement if applied).",
        displayDescription: "Export a user's profile as JSON (or active replacement if applied).",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "user",
                displayName: "user",
                description: "The user whose profile to export (defaults to yourself)",
                displayDescription: "The user whose profile to export (defaults to yourself)",
                type: ApplicationCommandOptionType.USER as number,
                required: false,
            },
            {
                name: "include_avatar",
                displayName: "include_avatar",
                description: "Include avatar URL and source in export",
                displayDescription: "Include avatar URL and source in export",
                type: ApplicationCommandOptionType.BOOLEAN as number,
                required: false,
            }
        ],
        async execute(args, ctx) {
            const currentUser = UserStore.getCurrentUser();
            const userId = args[0]?.value?.id || args[0]?.value || currentUser?.id;
            const includeAvatar = args[1]?.value ?? false;

            if (!userId) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not determine user.");
            }

            const user = UserStore.getUser(userId);
            if (!user) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not find user.");
            }

            // Check if there's an active replacement first
            const replacement = getReplacement(userId);
            let userObj: any;
            let profileObj: any;
            let avatarURL: string | undefined;
            let avatarSource: any;

            if (replacement) {
                // Use replacement data
                userObj = replacement.user;
                profileObj = replacement.profile;
                avatarURL = replacement.avatarURL;
                avatarSource = replacement.avatarSource;
            } else {
                // Use actual user data
                userObj = user;
                const profile = UserProfileStore.getUserProfile(userId);
                profileObj = profile;
                
                if (includeAvatar) {
                    avatarURL = avatarStuff.getUserAvatarURL(user);
                    avatarSource = avatarStuff.getUserAvatarSource(user);
                }
            }

            // Build export object
            const exportData: any = {};

            if (userObj) {
                exportData.user = userObj;
            }

            if (profileObj) {
                exportData.profile = profileObj;
            }

            if (includeAvatar) {
                if (avatarURL) exportData.avatarURL = avatarURL;
                if (avatarSource) exportData.avatarSource = avatarSource;
            }

            if (!exportData.user && !exportData.profile) {
                return sendBotMessage(ctx.channel.id, "Failed: No profile data found for user.");
            }

            // Format JSON with proper indentation
            const jsonString = JSON.stringify(exportData, null, 2);

            // Discord has a 2000 character limit, so we need to split if necessary
            const chunks: string[] = [];
            const maxChunkSize = 1900; // Leave room for formatting

            if (jsonString.length > maxChunkSize) {
                // Split into chunks if too large
                for (let i = 0; i < jsonString.length; i += maxChunkSize) {
                    chunks.push(jsonString.slice(i, i + maxChunkSize));
                }
            } else {
                chunks.push(jsonString);
            }

            const isSelf = userId === currentUser?.id;
            const username = user.username || "Unknown";
            const hasReplacement = !!replacement;
            const sourceLabel = hasReplacement ? "(active replacement)" : "(actual profile)";

            // Send the JSON chunks
            if (chunks.length === 1) {
                sendBotMessage(ctx.channel.id, 
                    `\`\`\`json\n${chunks[0]}\n\`\`\`\n\n📋 ${isSelf ? "Your" : `${username}'s`} profile ${sourceLabel} exported (${chunks[0].length} chars)`);
            } else {
                sendBotMessage(ctx.channel.id, 
                    `📋 ${isSelf ? "Your" : `${username}'s`} profile ${sourceLabel} exported (${jsonString.length} chars, ${chunks.length} parts):`);
                
                for (let i = 0; i < chunks.length; i++) {
                    sendBotMessage(ctx.channel.id, 
                        `**Part ${i + 1}/${chunks.length}:**\n\`\`\`json\n${chunks[i]}\n\`\`\``);
                }
            }
        },
    });
}
