import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { ApplicationCommandInputType, ApplicationCommandType, ClydeUtils } from "../types";
import { typedStorage, setBuffer } from "../storage";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;

export function createBufferInfoCommand() {
    return registerCommand({
        name: "impersonate-buffer-info",
        displayName: "impersonate-buffer-info",
        description: "Show information about the current buffer.",
        displayDescription: "Show information about the current buffer.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            if (!typedStorage.buffer?.user && !typedStorage.buffer?.profile) {
                return sendBotMessage(ctx.channel.id, "Buffer is empty.");
            }

            const username = typedStorage.buffer.sourceUsername || "Unknown";
            const timestamp = typedStorage.buffer.timestamp;
            const timeAgo = timestamp 
                ? `${Math.floor((Date.now() - timestamp) / 1000 / 60)} minutes ago`
                : "Unknown time";

            const hasUser = !!typedStorage.buffer.user;
            const hasProfile = !!typedStorage.buffer.profile;
            const hasAvatar = !!(typedStorage.buffer.avatarURL || typedStorage.buffer.avatarSource);

            let info = `Buffer Information\n`;
            info += `Source: ${username}\n`;
            info += `Copied: ${timeAgo}\n`;
            info += `Contains:\n`;
            info += `- User data: ${hasUser ? "Yes" : "No"}\n`;
            info += `- Profile data: ${hasProfile ? "Yes" : "No"}\n`;
            info += `- Avatar data: ${hasAvatar ? "Yes" : "No"}`;

            sendBotMessage(ctx.channel.id, info);
        },
    });
}

export function createBufferClearCommand() {
    return registerCommand({
        name: "impersonate-buffer-clear",
        displayName: "impersonate-buffer-clear",
        description: "Clear the current buffer.",
        displayDescription: "Clear the current buffer.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            if (!typedStorage.buffer?.user && !typedStorage.buffer?.profile) {
                return sendBotMessage(ctx.channel.id, "Buffer is already empty.");
            }

            setBuffer({});
            sendBotMessage(ctx.channel.id, "Buffer cleared.");
        },
    });
}