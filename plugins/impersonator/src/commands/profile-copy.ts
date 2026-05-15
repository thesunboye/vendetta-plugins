import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils } from "../types";
import { setReplacement } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");
const UserProfileStore = findByProps("getUserProfile");
const avatarStuff = findByProps("getUserAvatarURL", "getUserAvatarSource");

export function createProfileCopyCommand() {
    return registerCommand({
        name: "impersonate-profile-copy",
        displayName: "impersonate-profile-copy",
        description: "Copy another user's profile directly onto your own, locally only.",
        displayDescription: "Copy another user's profile directly onto your own, locally only.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "user",
                displayName: "user",
                description: "The user whose profile to copy",
                displayDescription: "The user whose profile to copy",
                type: ApplicationCommandOptionType.USER as number,
                required: true,
            }
        ],
        async execute(args, ctx) {
            const currentUser = UserStore.getCurrentUser();
            const sourceUserId = args[0]?.value?.id || args[0]?.value;

            if (!currentUser) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not get your user.");
            }

            if (!sourceUserId) {
                return sendBotMessage(ctx.channel.id, "Failed: You must provide a user to copy from.");
            }

            if (sourceUserId === currentUser.id) {
                return sendBotMessage(ctx.channel.id, "Failed: Cannot copy your own profile onto yourself.");
            }

            const sourceUser = UserStore.getUser(sourceUserId);
            if (!sourceUser) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not find the target user.");
            }

            const profile = UserProfileStore.getUserProfile(sourceUserId);

            // Apply the source user's profile to the current user, locally only
            setReplacement(currentUser.id, {
                user: sourceUser,
                profile: profile,
                avatarURL: avatarStuff.getUserAvatarURL(sourceUser),
                avatarSource: avatarStuff.getUserAvatarSource(sourceUser),
            });

            sendBotMessage(ctx.channel.id, `✨ Successfully copied ${sourceUser.username}'s profile onto yours (local only)!`);
        },
    });
}
