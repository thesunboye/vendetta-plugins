import { showConfirmationAlert } from "@vendetta/ui/alerts";

export const ensureInDMs = (ctx) => {
    if (ctx.guild || ctx.channel.rawRecipients.length !== 1) {
        showConfirmationAlert({
            title: "Command Unavailable",
            content: "This command can only be used in a private DM with one other person.",
            confirmText: "Okay",
            onConfirm: () => {},
        });
        return null;
    }
    return ctx.channel.rawRecipients[0];
};
