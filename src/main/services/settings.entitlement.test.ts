import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let mockUserData = "";
const mockFetch = jest.fn();
jest.mock("electron", () => ({
  app: { getPath: () => mockUserData },
  safeStorage: { isEncryptionAvailable: () => false },
  net: { fetch: mockFetch },
}));
jest.mock("../utils/log", () => ({
  licenseLog: { info: jest.fn(), error: jest.fn() },
}));
import { deleteLicense, getLicenseStatus, hasValidLicense, requirePro } from "./settings";

beforeEach(() => {
  mockUserData = mkdtempSync(join(tmpdir(), "paperweight-entitlement-"));
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
  rmSync(mockUserData, { recursive: true, force: true });
});

function seedLicense(expiresAt?: string, validatedAt = Date.now()) {
  writeFileSync(join(mockUserData, "license.enc"), JSON.stringify({
    key: "TEST-ONLY", tier: "test", validatedAt, expiresAt,
  }));
}

it("blocks Free and expired licenses, and observes deactivation without a restart", () => {
  expect(() => requirePro()).toThrow("Paperweight Pro is required");
  seedLicense();
  expect(() => requirePro()).not.toThrow();
  deleteLicense();
  expect(() => requirePro()).toThrow("Paperweight Pro is required");
  seedLicense(new Date(Date.now() - 1000).toISOString());
  expect(() => requirePro()).toThrow("Paperweight Pro is required");
  expect(mockFetch).not.toHaveBeenCalled();
});

it("keeps cached validation and offline behavior, and drops remotely revoked licenses", async () => {
  seedLicense();
  await expect(hasValidLicense()).resolves.toBe(true);
  expect(mockFetch).not.toHaveBeenCalled();
  seedLicense(undefined, Date.now() - 4 * 86_400_000);
  mockFetch.mockRejectedValueOnce(new Error("Offline"));
  await expect(hasValidLicense()).resolves.toBe(true);
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false }) });
  await expect(hasValidLicense()).resolves.toBe(false);
  expect(getLicenseStatus().active).toBe(false);
});

it("does not restore a removed license or overwrite a replacement from a stale validation", async () => {
  seedLicense(undefined, Date.now() - 4 * 86_400_000);
  let finish: ((value: { ok: boolean; json: () => Promise<{ valid: boolean }> }) => void) | undefined;
  mockFetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = hasValidLicense();
  deleteLicense();
  finish?.({ ok: true, json: async () => ({ valid: true }) });
  await expect(pending).resolves.toBe(false);
  expect(getLicenseStatus().active).toBe(false);

  seedLicense(undefined, Date.now() - 4 * 86_400_000);
  finish = undefined;
  mockFetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const replacementPending = hasValidLicense();
  deleteLicense();
  writeFileSync(join(mockUserData, "license.enc"), JSON.stringify({
    key: "REPLACEMENT", tier: "test", validatedAt: Date.now(),
  }));
  finish?.({ ok: true, json: async () => ({ valid: true }) });
  await expect(replacementPending).resolves.toBe(true);
  expect(getLicenseStatus().key).toBe("REPLACEMENT");
});

it("falls back to local entitlement when remote validation stalls", async () => {
  jest.useFakeTimers();
  seedLicense(undefined, Date.now() - 4 * 86_400_000);
  mockFetch.mockImplementationOnce(() => new Promise(() => undefined));
  const pending = hasValidLicense();
  await jest.advanceTimersByTimeAsync(8_000);
  await expect(pending).resolves.toBe(true);
  expect(getLicenseStatus().active).toBe(true);
  jest.useRealTimers();
});

it("times out if the validation response body stalls", async () => {
  jest.useFakeTimers();
  seedLicense(undefined, Date.now() - 4 * 86_400_000);
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => new Promise(() => undefined),
    text: () => new Promise(() => undefined),
  });
  const pending = hasValidLicense();
  await jest.advanceTimersByTimeAsync(8_000);
  await expect(pending).resolves.toBe(true);
  expect(getLicenseStatus().active).toBe(true);
  jest.useRealTimers();
});
