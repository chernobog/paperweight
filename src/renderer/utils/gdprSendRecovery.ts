export interface GdprSendRecovery {
  groupKey: string;
  requestType: "access" | "deletion";
  messageId?: string;
}

export function isGdprSendRecovery(
  pending: GdprSendRecovery | undefined,
  groupKey: string | undefined,
  requestType: "access" | "deletion",
): pending is GdprSendRecovery {
  return Boolean(
    pending
    && groupKey
    && pending.groupKey === groupKey
    && pending.requestType === requestType,
  );
}

export interface CaseMessageRecovery {
  caseId: number;
  action: "reminder" | "followup";
  messageId?: string;
}

export function isCaseMessageRecovery(
  pending: CaseMessageRecovery | undefined,
  caseId: number,
  action: "reminder" | "followup" | null,
): pending is CaseMessageRecovery {
  return Boolean(
    pending
    && Number.isFinite(caseId)
    && pending.caseId === caseId
    && action
    && pending.action === action,
  );
}
