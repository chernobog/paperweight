import { handle } from "./access";
import { IPC } from "@shared/ipc";
import { isString } from "@shared/validation";
import type {
  ActionType,
  CreateGdprCaseInput,
  GdprCaseEventInput,
  GdprCaseStatus,
  GdprRequestType,
} from "@shared/types";
import {
  closeGdprCase,
  createGdprCase,
  escalateGdprCase,
  getGdprCaseById,
  getGdprCaseReplies,
  getUnseenCaseReplyCount,
  insertGdprCaseEvent,
  linkGdprCaseMessage,
  markGdprCaseViewed,
  queryGdprCases,
  reopenGdprCase,
  unlinkGdprCaseMessage,
} from "../services/cases";
import { sendCaseMessage, sendPrivacyRequest } from "../services/gdprActions";
import { getActiveEmail } from "../credentials";

function isRequestType(value: unknown): value is GdprRequestType {
  return value === "access" || value === "deletion";
}

export function registerCaseHandlers(): void {
  handle(
    IPC.sendPrivacyRequest,
    async (
      _e,
      vendorId: unknown,
      companyKey: unknown,
      requestType: unknown,
      recipientOverride?: unknown,
      accountIdentifier?: unknown,
      languageOverride?: unknown,
      sentMessageId?: unknown,
      recordOnly?: unknown,
    ) => {
      if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
      if (!isString(companyKey) || !companyKey) throw new Error("Invalid company key");
      if (!isRequestType(requestType)) throw new Error("Invalid request type");
      if (recipientOverride !== undefined && (!isString(recipientOverride) || !recipientOverride.includes("@"))) {
        throw new Error("Invalid recipient");
      }
      if (accountIdentifier !== undefined && !isString(accountIdentifier)) {
        throw new Error("Invalid account identifier");
      }
      if (languageOverride !== undefined && !isString(languageOverride)) {
        throw new Error("Invalid language");
      }
      if (sentMessageId !== undefined && !isString(sentMessageId)) {
        throw new Error("Invalid sent message id");
      }
      const mailbox = getActiveEmail();
      if (!mailbox) throw new Error("No mailbox");
      const skipSend = recordOnly === true || Boolean(sentMessageId);
      return sendPrivacyRequest(
        vendorId,
        companyKey,
        requestType,
        mailbox,
        recipientOverride,
        accountIdentifier,
        languageOverride,
        skipSend ? undefined : async () => "confirmed",
        isString(sentMessageId) ? sentMessageId : undefined,
        skipSend,
      );
    },
  );

  handle(
    IPC.sendCaseMessage,
    async (_e, caseId: unknown, action: unknown, recordOnly?: unknown, sentMessageId?: unknown) => {
      if (typeof caseId !== "number") throw new Error("Invalid case id");
      if (action !== "reminder" && action !== "followup") throw new Error("Invalid action");
      if (sentMessageId !== undefined && !isString(sentMessageId)) {
        throw new Error("Invalid sent message id");
      }
      const mailbox = getActiveEmail();
      if (!mailbox) throw new Error("No mailbox");
      const skipSend = recordOnly === true || Boolean(sentMessageId);
      return sendCaseMessage(
        caseId,
        action,
        mailbox,
        skipSend ? undefined : async () => "confirmed",
        skipSend,
        isString(sentMessageId) ? sentMessageId : undefined,
      );
    },
  );

  handle(IPC.createGdprCase, (_e, input: CreateGdprCaseInput) =>
    createGdprCase(input),
  );

  handle(IPC.getGdprCase, (_e, id: number) => getGdprCaseById(id));

  handle(
    IPC.queryGdprCases,
    (_e, filter?: { status?: GdprCaseStatus; vendorId?: number }) =>
      queryGdprCases(filter),
  );

  handle(IPC.closeGdprCase, (_e, id: number) => closeGdprCase(id));

  handle(IPC.reopenGdprCase, (_e, id: number) => reopenGdprCase(id));

  handle(IPC.escalateGdprCase, (_e, id: number) => escalateGdprCase(id));

  handle(
    IPC.addGdprCaseEvent,
    (_e, caseId: number, actionType: ActionType, details?: GdprCaseEventInput) =>
      insertGdprCaseEvent(caseId, actionType, details),
  );

  handle(IPC.getGdprCaseReplies, (_e, caseId: number) =>
    getGdprCaseReplies(caseId),
  );

  handle(IPC.linkGdprCaseMessage, (_e, caseId: number, messageId: string) =>
    linkGdprCaseMessage(caseId, messageId),
  );

  handle(IPC.unlinkGdprCaseMessage, (_e, caseId: number, messageId: string) =>
    unlinkGdprCaseMessage(caseId, messageId),
  );

  handle(IPC.markGdprCaseViewed, (_e, caseId: number) => markGdprCaseViewed(caseId));

  handle(IPC.getUnseenCaseReplyCount, () => getUnseenCaseReplyCount());
}
