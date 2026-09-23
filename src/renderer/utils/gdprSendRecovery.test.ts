import {
  isCaseMessageRecovery,
  isGdprSendRecovery,
  type CaseMessageRecovery,
  type GdprSendRecovery,
} from "./gdprSendRecovery";

const pendingA: GdprSendRecovery = {
  groupKey: "company-a.example",
  requestType: "access",
  messageId: "sent-id",
};

it("keeps recovery on the same company after the dialog is closed", () => {
  expect(isGdprSendRecovery(pendingA, "company-a.example", "access")).toBe(true);
});

it("does not offer record-only recovery on a different company", () => {
  expect(isGdprSendRecovery(pendingA, "company-b.example", "access")).toBe(false);
});

it("stops recovery after company-change reset", () => {
  expect(isGdprSendRecovery(undefined, "company-b.example", "access")).toBe(false);
});

it("does not apply access recovery to a deletion request on the same company", () => {
  expect(isGdprSendRecovery(pendingA, "company-a.example", "deletion")).toBe(false);
});

const pendingCaseA: CaseMessageRecovery = {
  caseId: 4,
  action: "reminder",
  messageId: "follow-id",
};

it("keeps recovery on the same case and action after the dialog is closed", () => {
  expect(isCaseMessageRecovery(pendingCaseA, 4, "reminder")).toBe(true);
});

it("does not offer record-only recovery on a different case", () => {
  expect(isCaseMessageRecovery(pendingCaseA, 9, "reminder")).toBe(false);
});

it("stops recovery after case-change reset", () => {
  expect(isCaseMessageRecovery(undefined, 9, "reminder")).toBe(false);
});

it("does not apply reminder recovery to a follow-up on the same case", () => {
  expect(isCaseMessageRecovery(pendingCaseA, 4, "followup")).toBe(false);
});
