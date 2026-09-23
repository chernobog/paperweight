import { ipcMain } from "electron";
import { IPC } from "@shared/ipc";
import { getActiveEmail } from "../credentials";

// Every mailbox mutation must stay on the account it started on. Global
// settings, profile editing, account removal, and factory reset remain available.
const mailboxWrites = new Set<string>([
  IPC.markVendorUnsubscribed, IPC.markListUnsubscribed, IPC.markVendorReviewed,
  IPC.setVendorAccountEmail, IPC.addWhitelistEntry, IPC.removeWhitelistEntry,
  IPC.trashMessage, IPC.markMessageAsSpam, IPC.markMessageAsRead,
  IPC.trashVendorMessages, IPC.reportSpamVendor, IPC.executeRfc8058,
  IPC.openUnsubscribeUrl, IPC.sendEmail, IPC.sendPrivacyRequest, IPC.sendCaseMessage,
  IPC.createGdprCase, IPC.closeGdprCase,
  IPC.reopenGdprCase, IPC.escalateGdprCase, IPC.addGdprCaseEvent,
  IPC.linkGdprCaseMessage, IPC.unlinkGdprCaseMessage, IPC.markGdprCaseViewed,
  IPC.confirmPiiFinding, IPC.suppressPiiFinding, IPC.resyncData,
  IPC.updateServerConfig,
]);
const accountChanges = new Set<string>([
  IPC.switchAccount, IPC.removeAccount, IPC.wipeData,
  IPC.startGmailAuth, IPC.startMicrosoftAuth, IPC.saveImapConfig,
]);
let pendingMailboxWrites = 0;
let pendingAccountChanges = 0;

const ACTION_BUSY = "Wait for the current action to finish before continuing.";
const MAILBOX_CHANGED = "This action no longer matches the current mailbox.";

export function handle(
  channel: string,
  listener: Parameters<typeof ipcMain.handle>[1],
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    if (!mailboxWrites.has(channel) && !accountChanges.has(channel)) {
      return listener(event, ...args);
    }

    if (accountChanges.has(channel)) {
      if (pendingMailboxWrites > 0 || pendingAccountChanges > 0) {
        throw new Error(ACTION_BUSY);
      }
      pendingAccountChanges++;
      try {
        return Promise.resolve(listener(event, ...args)).finally(() => {
          pendingAccountChanges--;
        });
      } catch (error) {
        pendingAccountChanges--;
        throw error;
      }
    }

    if (pendingAccountChanges > 0) {
      throw new Error(ACTION_BUSY);
    }
    const origin = getActiveEmail();
    pendingMailboxWrites++;
    try {
      return Promise.resolve(listener(event, ...args)).then((result) => {
        if (getActiveEmail() !== origin) throw new Error(MAILBOX_CHANGED);
        return result;
      }).finally(() => {
        pendingMailboxWrites--;
      });
    } catch (error) {
      pendingMailboxWrites--;
      throw error;
    }
  });
}
