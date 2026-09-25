import { join } from "path";
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { getDb } from "../db";
import type { LicenseTier, LicenseStatus, McpSetup, WhitelistEntry } from "@shared/types";
import { licenseLog } from "../utils/log";

export const PRO_REQUIRED_MESSAGE = "Paperweight Pro is required. Upgrade in Settings to continue.";

export function requirePro(): void {
  if (!getLicenseStatus().active) throw new Error(PRO_REQUIRED_MESSAGE);
}

// --- Key-value settings ---

export function getSetting(key: string): string | undefined {
  const d = getDb();
  const row = d.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function saveSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value
  );
}

// --- Whitelist ---

export function addWhitelistEntry(value: string): void {
  const d = getDb();
  d.prepare("INSERT OR IGNORE INTO whitelist (value) VALUES (?)").run(
    value.toLowerCase()
  );
}

export function removeWhitelistEntry(value: string): void {
  const d = getDb();
  d.prepare("DELETE FROM whitelist WHERE value = ?").run(value.toLowerCase());
}

export function getWhitelistEntries(): WhitelistEntry[] {
  const d = getDb();
  return d
    .prepare("SELECT * FROM whitelist ORDER BY created_at")
    .all() as WhitelistEntry[];
}

// --- Auto-launch ---

const DESKTOP_FILE_NAME = "paperweight.desktop";

function getLinuxAutostartPath() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  const configDir =
    process.env["XDG_CONFIG_HOME"] || join(app.getPath("home"), ".config");
  return join(configDir, "autostart", DESKTOP_FILE_NAME);
}

function applyLinuxAutostart(enabled: boolean, minimized: boolean) {
  const filePath = getLinuxAutostartPath();

  if (!enabled) {
    if (existsSync(filePath)) unlinkSync(filePath);
    return;
  }

  const exec = minimized ? `${process.execPath} --hidden` : process.execPath;

  const content = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Paperweight",
    `Exec=${exec}`,
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");

  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
}

export function applyAutoLaunch(enabled: boolean, minimized: boolean): void {
  if (process.platform === "linux") {
    applyLinuxAutostart(enabled, minimized);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: enabled && minimized ? ["--hidden"] : [],
  });
}

export function wasLaunchedAsHidden(launchMinimized: boolean): boolean {
  if (process.argv.includes("--hidden")) return true;
  if (process.platform === "darwin" && launchMinimized) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require("electron") as typeof import("electron");
    return app.getLoginItemSettings().wasOpenedAtLogin;
  }
  return false;
}

// --- MCP setup ---

export function getMcpSetup(): McpSetup {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  const launcher = process.platform === "win32"
    ? "paperweight-mcp.cmd"
    : "paperweight-mcp";
  const command = app.isPackaged
    ? join(process.resourcesPath, launcher)
    : join(app.getAppPath(), "build", "mcp", launcher);
  return existsSync(command)
    ? { available: true, server: { command } }
    : { available: false };
}

// --- License ---

// Read old cached licenses and responses without exposing legacy deal labels.
type StoredLicenseTier = LicenseTier | "annual" | "test";


interface LicenseInfo {
  key: string;
  expiresAt?: string;
  validatedAt: number;
  tier: StoredLicenseTier;
  portalUrl?: string;
}

function getLicensePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  return join(app.getPath("userData"), "license.enc");
}

function saveLicense(info: LicenseInfo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { safeStorage } = require("electron") as typeof import("electron");
  const json = JSON.stringify(info);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    writeFileSync(getLicensePath(), encrypted);
  } else {
    writeFileSync(getLicensePath(), json, "utf-8");
  }
}

function loadLicense(): LicenseInfo | undefined {
  const path = getLicensePath();
  if (!existsSync(path)) return undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { safeStorage } = require("electron") as typeof import("electron");
    const data = readFileSync(path);
    if (safeStorage.isEncryptionAvailable()) {
      const json = safeStorage.decryptString(data);
      return JSON.parse(json) as LicenseInfo;
    } else {
      return JSON.parse(data.toString("utf-8")) as LicenseInfo;
    }
  } catch {
    return undefined;
  }
}

export function deleteLicense() {
  licenseLog.info("License deactivated");
  const path = getLicensePath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const info: LicenseInfo = {
    key,
    validatedAt: Date.now(),
    tier: "lifetime",
  };
  saveLicense(info);
  licenseLog.info(`License activated (tier: ${info.tier})`);
  return {
    active: true,
    tier: "lifetime",
    key,
  };
}

export function getLicenseStatus(): LicenseStatus {
  const info = loadLicense();
  return {
    active: true,
    tier: "lifetime",
    key: info?.key,
  };
}

export async function hasValidLicense(): Promise<boolean> {
  return true;
}
