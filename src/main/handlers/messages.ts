import { handle } from "./access";
import { IPC } from "@shared/ipc";
import { isEmailOrDomain, isIntInRange, isString } from "@shared/validation";
import {
  getAllUnsubscribeMethodsForVendor,
  getMessagesByVendor,
  markListUnsubscribed,
  markVendorUnsubscribed,
} from "../services/messages";
import { addWhitelistEntry, removeWhitelistEntry, getWhitelistEntries } from "../services/settings";
import { executeRfc8058Unsubscribe } from "../services/unsubscribe";
import { actionLog } from "../utils/log";

export function registerMessageHandlers(): void {
  handle(IPC.getAllUnsubscribeMethods, (_event, vendorId: unknown) => {
    if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
    return getAllUnsubscribeMethodsForVendor(vendorId);
  });

  handle(IPC.executeRfc8058, async (_event, url: unknown) => {
    if (!isString(url) || !url.startsWith("https://")) {
      throw new Error("Invalid URL: must be https");
    }
    return executeRfc8058Unsubscribe(url);
  });

  handle(IPC.markVendorUnsubscribed, (_event, vendorId: unknown) => {
    if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
    markVendorUnsubscribed(vendorId);
  });

  handle(IPC.markListUnsubscribed, (_event, vendorId: unknown, url: unknown) => {
    if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
    if (!isString(url) || !url.trim()) throw new Error("Invalid unsubscribe URL");
    markListUnsubscribed(vendorId, url);
  });

  handle(
    IPC.getVendorMessages,
    (_event, vendorId: unknown, limit: unknown) => {
      if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
      if (!isIntInRange(limit, 1, 100)) throw new Error("Invalid limit");
      return getMessagesByVendor(vendorId, limit);
    }
  );

  handle(IPC.addWhitelistEntry, (_event, value: unknown) => {
    if (!isEmailOrDomain(value)) throw new Error("Invalid value");
    actionLog.info("Whitelist entry added");
    return addWhitelistEntry(value);
  });

  handle(IPC.removeWhitelistEntry, (_event, value: unknown) => {
    if (!isEmailOrDomain(value)) throw new Error("Invalid value");
    actionLog.info("Whitelist entry removed");
    return removeWhitelistEntry(value);
  });

  handle(IPC.getWhitelistEntries, () => getWhitelistEntries());
}
