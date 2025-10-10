import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { decodeMessage, encodeMessage } from "../protocol";
import { typedStorage } from "../storage";
import { MessageModule, ClydeUtils } from "../types";

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

        // Prevent the protocol message from being displayed
        event.message.content = "";

        (async () => {
            switch (decoded.$) {
                case "COMMIT_PROFILE":
                    if (!decoded.targetUserId) return;

                    if (!typedStorage.replacements) {
                        typedStorage.replacements = {};
                    }

                    typedStorage.replacements[decoded.targetUserId] = {
                        user: decoded.user,
                        profile: decoded.profile,
                        avatarURL: decoded.avatarURL,
                        avatarSource: decoded.avatarSource,
                    };

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
                        typedStorage.replacements[decoded.targetUserId] = {
                            user: typedStorage.buffer.user,
                            profile: typedStorage.buffer.profile,
                            avatarURL: typedStorage.buffer.avatarURL,
                            avatarSource: typedStorage.buffer.avatarSource,
                        };
                        sendBotMessage(channelId, `${author.username} accepted. Profile applied to ${name}.`);
                    }

                    await deleteMessage(channelId, message.id).catch(() => {});
                    break;

                case "CLEAR_USER":
                    if (!decoded.targetUserId) return;

                    if (typedStorage.replacements[decoded.targetUserId]) {
                        delete typedStorage.replacements[decoded.targetUserId];
                        const user = UserStore.getUser(decoded.targetUserId);
                        sendBotMessage(channelId, `${author.username} cleared the profile for ${user?.username || "Unknown User"}.`);
                    }

                    await deleteMessage(channelId, message.id).catch(() => {});
                    break;

                case "CLEAR_ALL":
                    const count = Object.keys(typedStorage.replacements).length;
                    typedStorage.replacements = {};
                    
                    await deleteMessage(channelId, message.id).catch(() => {});
                    
                    if (count > 0) {
                        sendBotMessage(channelId, `${author.username} cleared all profile replacements (${count} total).`);
                    }
                    break;
            }
        })().catch(err => {
            sendBotMessage(channelId, `Error processing message: ${err?.message || "Unknown error"}`);
        });
    });
}
