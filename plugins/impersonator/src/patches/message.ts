import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { decodeMessage, encodeMessage } from "../protocol";
import { typedStorage, setReplacement, deleteReplacement } from "../storage";
import { MessageModule, ClydeUtils } from "../types";
import { getApplyData } from "../utils/applyData";

const UserStore = findByStoreName("UserStore");
const { _sendMessage, deleteMessage } = findByProps("_sendMessage", "deleteMessage") as MessageModule;
const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;

export function createMessagePatch() {
    if (!FluxDispatcher?.dispatch) return () => {};
    if (!UserStore?.getCurrentUser) return () => {};

    return before("dispatch", FluxDispatcher, (args) => {
        const [event] = args;
        if (event?.type !== "MESSAGE_CREATE") return;
        
        const { message } = event;
        if (!message?.content || message.author.id === UserStore.getCurrentUser()?.id) return;

        const decoded = decodeMessage(message.content);
        if (!decoded) return;

        const { author, channel_id: channelId } = message;

        (async () => {
            switch (decoded.$) {
                case "COMMIT_PROFILE":
                    if (!decoded.targetUserId) return;

                    if (!typedStorage.replacements) {
                        typedStorage.replacements = {};
                    }

                    const user = decoded.user ? { ...decoded.user } : undefined;
                    const profile = decoded.profile ? { ...decoded.profile } : undefined;
                    // Fix Date properties that became strings during protocol transfer
                    if (profile) {
                        if (profile.premiumSince && typeof profile.premiumSince === 'string') {
                            profile.premiumSince = new Date(profile.premiumSince) as any;
                        }
                        if (profile.premiumGuildSince && typeof profile.premiumGuildSince === 'string') {
                            profile.premiumGuildSince = new Date(profile.premiumGuildSince) as any;
                        }
                    }

                    setReplacement(decoded.targetUserId, {
                        user: user,
                        profile: profile,
                        avatarURL: decoded.avatarURL,
                        avatarSource: decoded.avatarSource,
                    });

                    const { body: { id: acceptMsgId } } = await _sendMessage(channelId, {
                        nonce: Date.now(),
                        content: encodeMessage({
                            $: "COMMIT_ACCEPT",
                            targetUserId: decoded.targetUserId,
                        })
                    }, {});

                    setTimeout(async () => {
                        await Promise.allSettled([
                            deleteMessage(channelId, message.id),
                            deleteMessage(channelId, acceptMsgId)
                        ]);
                    }, 2000);

                    const targetUser = UserStore.getUser(decoded.targetUserId);
                    const targetName = targetUser?.username || `User ${decoded.targetUserId}`;
                    sendBotMessage(channelId, `Profile applied to ${targetName}. ${author.username} can also see the changes.`);
                    break;

                case "COMMIT_ACCEPT":
                    if (!decoded.targetUserId) return;

                    const target = UserStore.getUser(decoded.targetUserId);
                    const name = target?.username || `User ${decoded.targetUserId}`;

                    if (typedStorage.buffer?.user || typedStorage.buffer?.profile) {
                        setReplacement(decoded.targetUserId, getApplyData());
                        
                        sendBotMessage(channelId, `${author.username} accepted. Profile applied to ${name}.`);
                    }

                    await deleteMessage(channelId, message.id).catch(() => {});
                    break;

                case "CLEAR_USER":
                    if (!decoded.targetUserId) return;

                    if (typedStorage.replacements[decoded.targetUserId]) {
                        deleteReplacement(decoded.targetUserId);
                        
                        const user = UserStore.getUser(decoded.targetUserId);
                        sendBotMessage(channelId, `${author.username} cleared the profile for ${user?.username || "Unknown User"}.`);
                    }

                    await deleteMessage(channelId, message.id).catch(() => {});
                    break;

                case "CLEAR_ALL":
                    if (typedStorage.replacements[author.id]) {
                        deleteReplacement(author.id);
                    }
                    
                    await deleteMessage(channelId, message.id).catch(() => {});
                    
                    sendBotMessage(channelId, `${author.username} cleared their profile replacement.`);
                    break;
            }
        })().catch(err => {
            sendBotMessage(channelId, `Error processing message: ${err?.message || "Unknown error"}`);
        });
    });
}
