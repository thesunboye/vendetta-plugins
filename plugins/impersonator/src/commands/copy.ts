import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils } from "../types";
import { setBuffer } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");
const UserProfileStore = findByProps("getUserProfile");
const avatarStuff = findByProps("getUserAvatarURL", "getUserAvatarSource");

export function createCopyCommand() {
    return registerCommand({
        name: "impersonate-copy",
        displayName: "impersonate-copy",
        description: "Copy someone's profile information into the buffer.",
        displayDescription: "Copy someone's profile information into the buffer.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "user",
                displayName: "user",
                description: "The user whose profile to copy (defaults to yourself)",
                displayDescription: "The user whose profile to copy (defaults to yourself)",
                type: ApplicationCommandOptionType.USER as number,
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

            const profile = UserProfileStore.getUserProfile(userId);

            setBuffer({
                user: user,
                profile: profile,
                avatarURL: avatarStuff.getUserAvatarURL(user),
                avatarSource: avatarStuff.getUserAvatarSource(user),
                sourceUsername: user.username,
                timestamp: Date.now(),
            });

            const isSelf = userId === currentUser?.id;
            sendBotMessage(ctx.channel.id, isSelf 
                ? "Copied your profile into buffer."
                : `Copied ${user.username}'s profile into buffer.`);
        },
    });
}