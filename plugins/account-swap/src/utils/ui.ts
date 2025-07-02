import { showConfirmationAlert } from "@vendetta/ui/alerts";

/**
 * Shows a confirmation dialog and returns a promise that resolves to a boolean.
 */
export const confirmAction = (title: string, content: string): Promise<boolean> =>
    new Promise((resolve) => {
        showConfirmationAlert({
            title,
            content,
            confirmText: "Yes, I'm sure",
            cancelText: "Cancel",
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });

/**
 * Ensures a command is executed in a DM, showing an alert otherwise.
 * @returns The other user in the DM if valid, otherwise null.
 */
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
