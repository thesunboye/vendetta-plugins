import { registerCommand } from "@vendetta/commands";
import { findByProps } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { ApplicationCommandInputType, ApplicationCommandType, ClydeUtils } from "../types";
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

export function createPossessAcceptEveryoneEnableCommand() {
    return registerCommand({
        name: "possess-accept-everyone-enable",
        displayName: "possess-accept-everyone-enable",
        description: "⚠️ DANGEROUS: Automatically accept possession from ANYONE.",
        displayDescription: "⚠️ DANGEROUS: Automatically accept possession from ANYONE.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        async execute(args, ctx) {
            if (storage.possessAcceptFromEveryone) {
                sendBotMessage(ctx.channel.id, "Auto-accept possession from everyone is already enabled.");
                return;
            }

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

            storage.possessAcceptFromEveryone = true;
            sendBotMessage(ctx.channel.id, "⚠️ **POSSESSION DANGER MODE ENABLED** ⚠️\nYou will now automatically accept all possession requests. Use `/possess-accept-everyone-disable` to turn this off.");
        },
    });
}

export function createPossessAcceptEveryoneDisableCommand() {
    return registerCommand({
        name: "possess-accept-everyone-disable",
        displayName: "possess-accept-everyone-disable",
        description: "Disable automatically accepting possession from everyone.",
        displayDescription: "Disable automatically accepting possession from everyone.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            if (!storage.possessAcceptFromEveryone) {
                sendBotMessage(ctx.channel.id, "Auto-accept possession from everyone is already disabled.");
                return;
            }

            storage.possessAcceptFromEveryone = false;
            sendBotMessage(ctx.channel.id, "✅ **POSSESSION DANGER MODE DISABLED**\nYou will now receive confirmation prompts for possession requests.");
        },
    });
}

export function createPossessAcceptEveryoneStatusCommand() {
    return registerCommand({
        name: "possess-accept-everyone-status",
        displayName: "possess-accept-everyone-status",
        description: "Check if auto-accept possession from everyone is enabled.",
        displayDescription: "Check if auto-accept possession from everyone is enabled.",
        type: ApplicationCommandType.CHAT as number,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT as number,
        applicationId: "-1",
        options: [],
        execute(args, ctx) {
            const status = storage.possessAcceptFromEveryone ? 
                "⚠️ **ENABLED** - You are automatically accepting possession from EVERYONE!" : 
                "✅ **DISABLED** - You will receive confirmation prompts for possession requests.";
            
            sendBotMessage(ctx.channel.id, `Auto-accept possession from everyone: ${status}`);
        },
    });
}
