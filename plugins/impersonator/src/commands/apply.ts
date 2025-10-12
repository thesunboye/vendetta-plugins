import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, ClydeUtils, MessageModule } from "../types";
import { getBuffer, setReplacement } from "../storage";
import { encodeMessage } from "../protocol";
import { ensureInDMs } from "../utils/ui";

const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;
const UserStore = findByStoreName("UserStore");

export function createApplyCommand() {
    return registerCommand({
        name: "impersonate-apply",
        displayName: "impersonate-apply",
        description: "Apply the buffered profile to a target user.",
        displayDescription: "Apply the buffered profile to a target user.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "target",
                displayName: "target",
                description: "The user to apply the profile to (defaults to yourself)",
                displayDescription: "The user to apply the profile to (defaults to yourself)",
                type: ApplicationCommandOptionType.USER as number,
                required: false,
            },
            {
                name: "local",
                displayName: "local",
                description: "Apply locally without sending to other user",
                displayDescription: "Apply locally without sending to other user",
                type: ApplicationCommandOptionType.BOOLEAN as number,
                required: false,
            }
        ],
        async execute(args, ctx) {
            const buffer = getBuffer();
            if (!buffer?.user && !buffer?.profile) {
                return sendBotMessage(ctx.channel.id, "Failed: Buffer is empty. Use /impersonate-copy first.");
            }

            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not get current user.");
            }

            const targetUserId = args[0]?.value?.id || args[0]?.value || currentUser.id;
            const isLocal = args.find(arg => arg.name === "local")?.value ?? false;
            const isSelf = targetUserId === currentUser.id;
            const sourceUsername = buffer.sourceUsername || "Unknown";

            const targetUser = UserStore.getUser(targetUserId) ?? currentUser;
            if (!targetUser) {
                return sendBotMessage(ctx.channel.id, "Failed: Could not find target user.");
            }

            if (isSelf && buffer.user?.id === currentUser.id) {
                return sendBotMessage(ctx.channel.id, "Failed: Cannot apply your own profile onto yourself.");
            }

            const user = buffer.user ? { ...buffer.user } : undefined;
            const profile = buffer.profile ? { ...buffer.profile } : undefined;
            // Fix Date properties that became strings during protocol transfer
            if (profile) {
                if (profile.premiumSince && typeof profile.premiumSince === 'string') {
                    profile.premiumSince = new Date(profile.premiumSince) as any;
                }
                if (profile.premiumGuildSince && typeof profile.premiumGuildSince === 'string') {
                    profile.premiumGuildSince = new Date(profile.premiumGuildSince) as any;
                }
            }

            const applyData = {
                user: user,
                profile: profile,
                avatarURL: buffer.avatarURL,
                avatarSource: buffer.avatarSource,
            };

            if (isLocal) {
                setReplacement(targetUserId, applyData);
                
                sendBotMessage(ctx.channel.id, isSelf
                    ? `Applied ${sourceUsername}'s profile to yourself locally.`
                    : `Applied ${sourceUsername}'s profile to ${targetUser.username} locally.`);
                return;
            }

            const inDM = !ctx.guild && ctx.channel.rawRecipients?.length === 1;

            if (inDM) {
                const otherUser = ensureInDMs(ctx);
                if (!otherUser) return;

                const { body: { id: messageId } } = await _sendMessage(ctx.channel.id, {
                    nonce: Date.now(),
                    content: encodeMessage({ 
                        $: "COMMIT_PROFILE",
                        targetUserId,
                        user: applyData.user,
                        profile: applyData.profile,
                        avatarURL: applyData.avatarURL,
                        avatarSource: applyData.avatarSource,
                    }),
                }, {});

                setTimeout(() => deleteMessage(ctx.channel.id, messageId).catch(() => {}), 12000);

                sendBotMessage(ctx.channel.id, isSelf
                    ? `Profile request sent to ${otherUser.username} for yourself.`
                    : `Profile request sent to ${otherUser.username} for ${targetUser.username}.`);
            } else {
                setReplacement(targetUserId, applyData);
                
                sendBotMessage(ctx.channel.id, isSelf
                    ? `Applied ${sourceUsername}'s profile to yourself.`
                    : `Applied ${sourceUsername}'s profile to ${targetUser.username}.`);
            }
        },
    });
}