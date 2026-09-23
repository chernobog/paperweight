import { handle } from "./access";
import { IPC } from "@shared/ipc";
import { getDashboardStats, getDashboardTrend, getImpactStats, getRiskCounts, getActivityLog } from "../services/stats";

export function registerStatsHandlers(): void {
  handle(IPC.getDashboardStats, () => getDashboardStats());

  handle(IPC.getDashboardTrend, () => getDashboardTrend(90));

  handle(IPC.getImpactStats, () => getImpactStats());

  handle(IPC.getRiskCounts, () => getRiskCounts());

  handle(IPC.getActivityLog, (_e, limit: number, offset: number) =>
    getActivityLog(limit, offset)
  );
}
