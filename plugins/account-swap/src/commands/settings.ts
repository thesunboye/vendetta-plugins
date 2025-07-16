import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { ApplicationCommandInputType, ApplicationCommandType, ApplicationCommandOptionType, ClydeUtils, ApplicationCommandOptionChoice } from "../types";
import { confirmAction } from "../utils/ui";

const { sendBotMessage } = findByProps("sendBotMessage") as ClydeUtils;

export function createAcceptEveryoneEnableCommand() {
    return registerCommand({
        name: "swap-accept-everyone-enable",
        displayName: "swap-accept-everyone-enable",
        description: "⚠️ DANGEROUS: Automatically accept swaps from ANYONE without confirmation.",
        displayDescription: "⚠️ DANGEROUS: Automatically accept swaps from ANYONE without confirmation.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            if (storage.acceptFromEveryone) {
                sendBotMessage(ctx.channel.id, "Auto-accept from everyone is already enabled.");
                return;
            }

            const isConfirmed = await confirmAction(
                "⚠️ EXTREMELY DANGEROUS ⚠️",
                "This will automatically accept ALL swap requests from ANYONE without any confirmation. Your account will be at EXTREME RISK. Only enable this if you understand the consequences and trust everyone who might send you swap requests. Are you absolutely sure?"
            );

            if (!isConfirmed) return;

            const doubleConfirm = await confirmAction(
                "⚠️ FINAL WARNING ⚠️",
                "This is your last chance to back out. Enabling this feature means ANYONE can swap accounts with you instantly. Your Discord account could be stolen or compromised. Are you 100% certain you want to proceed?"
            );

            if (!doubleConfirm) return;

            storage.acceptFromEveryone = true;
            sendBotMessage(ctx.channel.id, "⚠️ **DANGER MODE ENABLED** ⚠️\nYou will now automatically accept swap requests from EVERYONE. Use `/swap-accept-everyone-disable` to turn this off.");
        },
    });
}

export function createAcceptEveryoneDisableCommand() {
    return registerCommand({
        name: "swap-accept-everyone-disable",
        displayName: "swap-accept-everyone-disable",
        description: "Disable automatically accepting swaps from everyone.",
        displayDescription: "Disable automatically accepting swaps from everyone.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            if (!storage.acceptFromEveryone) {
                sendBotMessage(ctx.channel.id, "Auto-accept from everyone is already disabled.");
                return;
            }

            storage.acceptFromEveryone = false;
            sendBotMessage(ctx.channel.id, "✅ **DANGER MODE DISABLED**\nYou will now receive confirmation prompts for swap requests (except from whitelisted users).");
        },
    });
}

export function createAcceptEveryoneStatusCommand() {
    return registerCommand({
        name: "swap-accept-everyone-status",
        displayName: "swap-accept-everyone-status",
        description: "Check if auto-accept from everyone is enabled.",
        displayDescription: "Check if auto-accept from everyone is enabled.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            const status = storage.acceptFromEveryone ? 
                "⚠️ **ENABLED** - You are automatically accepting swaps from EVERYONE!" : 
                "✅ **DISABLED** - You will receive confirmation prompts for swap requests.";
            
            sendBotMessage(ctx.channel.id, `Auto-accept from everyone: ${status}`);
        },
    });
}

export function createPossessAcceptModeCommand() {
    return registerCommand({
        name: "possess-accept-mode",
        displayName: "possess-accept-mode",
        description: "Set the auto-accept mode for possession requests and invites.",
        displayDescription: "Set the auto-accept mode for possession requests and invites.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [
            {
                name: "mode",
                displayName: "mode",
                description: "Auto-accept mode for possession",
                displayDescription: "Auto-accept mode for possession",
                type: ApplicationCommandOptionType.STRING as number,
                required: true,
                // @ts-expect-error: Vendetta is missing this type
                choices: [
                    {
                        name: "none",
                        displayName: "none",
                        label: "none",
                        value: "none"
                    },
                    {
                        name: "invite",
                        displayName: "invite",
                        label: "invite",
                        value: "invite"
                    },
                    {
                        name: "request",
                        displayName: "request",
                        label: "request",
                        value: "request"
                    },
                    {
                        name: "both",
                        displayName: "both",
                        label: "both",
                        value: "both"
                    }
                ] as ApplicationCommandOptionChoice[]
            }
        ],
        async execute(args, ctx) {
            const mode = args.find(arg => arg.name === "mode")?.value as string;
            
            if (!mode || !["none", "invite", "request", "both"].includes(mode.toLowerCase())) {
                sendBotMessage(ctx.channel.id, "❌ Invalid mode. Please choose: **none**, **invite**, **request**, or **both**.\n\n" +
                    "• **none** - Manual confirmation for all\n" +
                    "• **invite** - Auto-accept invites only\n" +
                    "• **request** - Auto-accept requests only\n" +
                    "• **both** - Auto-accept all (DANGEROUS)");
                return;
            }

            const normalizedMode: string = mode.toLowerCase();

            if (normalizedMode === "both") {
                const isConfirmed = await confirmAction(
                    "⚠️ EXTREMELY DANGEROUS ⚠️",
                    "This will automatically accept ALL possession requests and invites from ANYONE without any confirmation. Your account could be given away or taken over instantly. Are you absolutely sure?"
                );

                if (!isConfirmed) return;

                const doubleConfirm = await confirmAction(
                    "⚠️ FINAL WARNING ⚠️",
                    "This is your last chance. Enabling this means ANYONE can take or be given your account. Your Discord account could be stolen. Are you 100% certain?"
                );

                if (!doubleConfirm) return;
            } else if (normalizedMode === "invite" || normalizedMode === "request") {
                const isConfirmed = await confirmAction(
                    "⚠️ WARNING ⚠️",
                    `This will automatically accept ${normalizedMode === "invite" ? "possession invites" : "possession requests"} from anyone without confirmation. Are you sure?`
                );

                if (!isConfirmed) return;

                const doubleConfirm = await confirmAction(
                    "⚠️ FINAL WARNING ⚠️",
                    `This is your last chance. Enabling auto-accept for ${normalizedMode === "invite" ? "possession invites" : "possession requests"} means ANYONE can ${normalizedMode === "invite" ? "give you their account" : "take over your account"} without confirmation. Are you certain?`
                );

                if (!doubleConfirm) return;
            }

            storage.possessAcceptMode = normalizedMode;
            
            const modeDescriptions = {
                "none": "✅ **SAFE MODE** - Manual confirmation required for all possession requests and invites.",
                "invite": "⚠️ **INVITE AUTO-ACCEPT** - Automatically accepting possession invites, manual confirmation for requests.",
                "request": "⚠️ **REQUEST AUTO-ACCEPT** - Automatically accepting possession requests, manual confirmation for invites.",
                "both": "🚨 **DANGER MODE** - Automatically accepting ALL possession requests and invites!"
            };

            sendBotMessage(ctx.channel.id, `Possession accept mode set to: **${normalizedMode}**\n${modeDescriptions[normalizedMode]}`);
        },
    });
}

export function createPossessAcceptModeStatusCommand() {
    return registerCommand({
        name: "possess-accept-mode-status",
        displayName: "possess-accept-mode-status",
        description: "Check the current auto-accept mode for possession requests and invites.",
        displayDescription: "Check the current auto-accept mode for possession requests and invites.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            const mode = storage.possessAcceptMode || "none";
            
            const modeDescriptions = {
                "none": "✅ **SAFE MODE** - Manual confirmation required for all possession requests and invites.",
                "invite": "⚠️ **INVITE AUTO-ACCEPT** - Automatically accepting possession invites, manual confirmation for requests.",
                "request": "⚠️ **REQUEST AUTO-ACCEPT** - Automatically accepting possession requests, manual confirmation for invites.",
                "both": "🚨 **DANGER MODE** - Automatically accepting ALL possession requests and invites!"
            };

            sendBotMessage(ctx.channel.id, `Current possession accept mode: **${mode}**\n${modeDescriptions[mode]}`);
        },
    });
}
