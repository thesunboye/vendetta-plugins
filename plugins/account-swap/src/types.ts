export const enum ApplicationCommandInputType {
    BUILT_IN,
    BUILT_IN_TEXT,
    BUILT_IN_INTEGRATION,
    BOT,
    PLACEHOLDER,
}

export const enum ApplicationCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP,
    STRING,
    INTEGER,
    BOOLEAN,
    USER,
    CHANNEL,
    ROLE,
    MENTIONABLE,
    NUMBER,
    ATTACHMENT,
}

export const enum ApplicationCommandType {
    CHAT = 1,
    USER,
    MESSAGE,
}

export type SendMessageResponse = {
    headers: Record<string, string>;
    body: {
        id: string;
    }
}

export type ClydeUtils = {
    sendBotMessage(channelId: string, content: string);
};

export type MessageModule = {
    sendMessage(channelId: string, message: { content: string }) : Promise<SendMessageResponse>;
    deleteMessage(channelId: string, messageId: string): Promise<undefined>;
};

export type AccountModule = {
    switchAccountToken(token: string);
};
