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
    _sendMessage(channelId: string, message: { nonce: string | number; content: string }, options: {}) : Promise<SendMessageResponse>;
    deleteMessage(channelId: string, messageId: string): Promise<undefined>;
};

export type AccountModule = {
    switchAccountToken(token: string);
};

export interface ApplicationCommandOption {
    name: string;
    displayName: string;
    description: string;
    displayDescription: string;
    type: number;
    required?: boolean;
    choices?: ApplicationCommandOptionChoice[];
}

export interface ApplicationCommandOptionChoice {
    name: string;
    displayName: string;
    label: string;
    value: string;
}
