import { handle } from "./access";
import { IPC } from "@shared/ipc";
import { isIntInRange } from "@shared/validation";
import {
  confirmPiiFinding,
  getPiiOverview,
  getPiiValueCompanies,
  getVendorPiiSummary,
  revealPiiValues,
  revealVendorPiiValues,
  suppressPiiFinding,
} from "../services/pii";
import { markProfileAnalysisStale } from "../sync-manager";

const isRef = (v: unknown): v is number => isIntInRange(v, 1, Number.MAX_SAFE_INTEGER);

export function registerPiiHandlers(): void {
  handle(IPC.getVendorPiiSummary, (_event, vendorId: unknown) => {
    if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
    return getVendorPiiSummary(vendorId);
  });

  handle(IPC.getPiiOverview, () => getPiiOverview());

  handle(
    IPC.getPiiValueCompanies,
    (_event, ref: unknown, order: unknown) => {
      if (!isRef(ref)) throw new Error("Invalid finding reference");
      return getPiiValueCompanies(ref, order === "oldest" ? "oldest" : "recent");
    },
  );

  // The only channels that return full values, and only because the user asked
  // to see them. Each reuses its list's own grouping, so neither can reveal
  // anything that list was hiding.
  handle(IPC.revealVendorPiiValues, (_event, vendorId: unknown) => {
    if (typeof vendorId !== "number") throw new Error("Invalid vendor id");
    return revealVendorPiiValues(vendorId);
  });

  handle(IPC.revealPiiValues, () => revealPiiValues());

  // The rest take the opaque handle the summary handed out and return nothing: the
  // resolved (type, value) stays in the service, so a success response can't
  // leak back what the renderer was never given.
  handle(IPC.confirmPiiFinding, (_event, ref: unknown) => {
    if (!isRef(ref)) throw new Error("Invalid finding reference");
    if (confirmPiiFinding(ref)) markProfileAnalysisStale();
  });

  handle(IPC.suppressPiiFinding, (_event, ref: unknown) => {
    if (!isRef(ref)) throw new Error("Invalid finding reference");
    suppressPiiFinding(ref);
  });
}
