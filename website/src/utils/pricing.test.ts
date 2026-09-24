import {
  checkoutUrl,
  getCryptoPayPricing,
  isLifetimeAvailable,
} from "./pricing";

it("keeps Lifetime public through October 7 Amsterdam time, then removes it", () => {
  expect(isLifetimeAvailable(Date.parse("2026-09-30T00:00:00+02:00"))).toBe(
    true,
  );
  expect(isLifetimeAvailable(Date.parse("2026-10-07T23:59:59.999+02:00"))).toBe(
    true,
  );
  expect(isLifetimeAvailable(Date.parse("2026-10-08T00:00:00+02:00"))).toBe(
    false,
  );
});

it("sends each selected plan directly to its product checkout", () => {
  for (const plan of ["annual", "cleanup", "lifetime"] as const) {
    const url = new URL(checkoutUrl(plan));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://buy.polar.sh/polar_cl_Xw4DvPpmzCehGjZMTlePIVE8UxO63FGtfw1bR3FnaxG",
    );
  }
  expect(new URL(checkoutUrl("annual")).searchParams.get("product_id")).toBe(
    "0c74b8ca-6492-42c9-867f-659617203246",
  );
  expect(new URL(checkoutUrl("cleanup")).searchParams.get("product_id")).toBe(
    "e6f951f0-4655-400b-8b14-06d81e5a1d62",
  );
  expect(new URL(checkoutUrl("lifetime")).searchParams.get("product_id")).toBe(
    "84eecff9-fce2-4395-bd21-867543559f11",
  );
});

it("uses the correct crypto prices and carries each plan into payment instructions", () => {
  expect(getCryptoPayPricing("annual")).toMatchObject({
    priceUsd: 55,
    planName: "Paperweight Pro",
    duration: "1 year",
  });
  expect(getCryptoPayPricing("cleanup")).toMatchObject({
    priceUsd: 25,
    planName: "Cleanup Pass",
    duration: "30 days",
  });
});

it("offers permanent Lifetime access for $90 through the manual crypto flow", () => {
  expect(getCryptoPayPricing("lifetime")).toEqual({
    priceUsd: 90,
    planName: "Early-supporter Lifetime",
    duration: "life",
    renewal: "One payment for permanent Pro access. No renewal.",
  });
});
