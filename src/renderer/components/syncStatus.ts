import type { SyncStatus } from "@shared/types";

function formatSyncPeriod(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear && startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startMonth}–${endMonth} ${startYear}`;
  }
  return `${startMonth} ${startYear}–${endMonth} ${endYear}`;
}

export function formatRunningSyncStatus(
  status: SyncStatus,
  now = Date.now(),
): string {
  const details = [
    `${status.progress.toLocaleString()} messages processed`,
  ];
  if (status.periodStart !== undefined && status.periodEnd !== undefined) {
    details.push(formatSyncPeriod(status.periodStart, status.periodEnd));
  }
  if (status.startedAt !== undefined) {
    const elapsedMinutes = Math.max(
      0,
      Math.floor((now - status.startedAt) / 60_000),
    );
    details.push(`${elapsedMinutes}m elapsed`);
  }
  return `Syncing... ${details.join(" · ")}`;
}

export function isOAuthTokenError(error?: string): boolean {
  return !!(
    error &&
    (error.includes("Gmail authorization expired") ||
      error.includes("Failed to refresh access token") ||
      error.includes("Authorization expired. Reconnect your account"))
  );
}
