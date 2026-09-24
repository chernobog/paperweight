import { POST } from "./route";

const originalFetch = global.fetch;
const originalKey = process.env.POLAR_API_KEY;
const originalOrg = process.env.POLAR_ORGANIZATION_ID;
const mockFetch = jest.fn();
const now = Date.parse("2026-09-30T12:00:00Z");
const annual = "d117b32b-f60e-4739-908b-ffc36e2cc523";
const cleanup = "26df0e3e-07fe-4f23-9bf4-2ee387e2c6b4";
const lifetime = "19517682-fe41-46e4-b1e7-97d0c8c8607a";
const testing = "be8f9c70-8a07-4e51-9d56-932e52bd9631";

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  mockFetch.mockReset();
  global.fetch = mockFetch;
  process.env.POLAR_API_KEY = "test-only";
  process.env.POLAR_ORGANIZATION_ID = "test-organization";
});
afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.POLAR_API_KEY;
  else process.env.POLAR_API_KEY = originalKey;
  if (originalOrg === undefined) delete process.env.POLAR_ORGANIZATION_ID;
  else process.env.POLAR_ORGANIZATION_ID = originalOrg;
});

async function validate(data: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce(Response.json(data));
  const response = await POST(
    new Request("http://localhost/api/license", {
      method: "POST",
      body: JSON.stringify({ key: "TEST-ONLY" }),
    }),
  );
  return response.json();
}

it.each([
  [annual, "pro", "2027-09-30T12:00:00Z"],
  [annual, "pro", null],
  [cleanup, "cleanup", "2026-10-30T12:00:00Z"],
  [lifetime, "lifetime", null],
  [testing, "pro", null],
  [testing, "pro", "2026-10-01T12:00:00Z"],
])("grants Pro for the recognized benefit %s", async (benefit, tier, expiresAt) => {
  const result = await validate({
    status: "granted",
    benefit_id: benefit,
    expires_at: expiresAt,
  });
  expect(result).toMatchObject({ valid: true, tier, isExpired: false });
  expect(result.expiresAt).toBe(expiresAt ?? undefined);
});

it("requires an expiry for the one-time Cleanup Pass", async () => {
  for (const expiry of [
    undefined,
    null,
    "",
    "invalid",
    "2026-09-30T12:00:00Z",
    "2026-09-29T12:00:00Z",
  ]) {
    const result = await validate({
      status: "granted",
      benefit_id: cleanup,
      expires_at: expiry,
    });
    expect(result.valid).toBe(false);
  }
});

it.each(["revoked", "disabled"])("rejects %s keys", async (status) => {
  expect((await validate({ status, benefit_id: lifetime })).valid).toBe(false);
});

it.each([
  undefined,
  "unknown",
  "toString",
])("rejects unknown benefits: %s", async (benefit) => {
  expect(
    (await validate({ status: "granted", benefit_id: benefit })).valid,
  ).toBe(false);
});

it("returns the customer portal without exposing the upstream license or customer", async () => {
  mockFetch.mockResolvedValueOnce(
    Response.json({
      status: "granted",
      benefit_id: annual,
      expires_at: "2027-09-30T12:00:00Z",
      customer_id: "customer",
      key: "private",
    }),
  );
  mockFetch.mockResolvedValueOnce(
    Response.json({ customer_portal_url: "https://polar.sh/portal" }),
  );
  const response = await POST(
    new Request("http://localhost/api/license", {
      method: "POST",
      body: JSON.stringify({ key: "TEST-ONLY" }),
    }),
  );
  expect(await response.json()).toEqual({
    valid: true,
    tier: "pro",
    status: "granted",
    isExpired: false,
    expiresAt: "2027-09-30T12:00:00Z",
    portalUrl: "https://polar.sh/portal",
  });
});

it("accepts subscription Pro without expiry but enforces any explicit Pro expiry", async () => {
  expect(
    (await validate({ status: "granted", benefit_id: annual })).valid,
  ).toBe(true);
  for (const expiresAt of [
    "invalid",
    "",
    "2026-09-30T12:00:00Z",
    "2026-09-29T12:00:00Z",
  ]) {
    expect(
      (
        await validate({
          status: "granted",
          benefit_id: annual,
          expires_at: expiresAt,
        })
      ).valid,
    ).toBe(false);
  }
  expect(
    (
      await validate({
        status: "revoked",
        benefit_id: annual,
        expires_at: null,
      })
    ).valid,
  ).toBe(false);
});
