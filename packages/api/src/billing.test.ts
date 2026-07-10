import { describe, expect, test } from "bun:test";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js";
import { TIER_LIMITS } from "@orch/workspace/tiers";

import { normalizeBillingState } from "./billing";

function createCustomerState(productId = "polar-pro"): CustomerState {
  return {
    activeSubscriptions: [
      {
        productId,
        status: "active",
        currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      },
    ],
  } as CustomerState;
}

describe("normalizeBillingState", () => {
  test("returns free state when there is no subscription or lifetime override", () => {
    const result = normalizeBillingState(null);

    expect(result.tier).toBe("free");
    expect(result.subscription).toBeNull();
    expect(result.limits).toEqual(TIER_LIMITS.free);
  });

  test("returns lifetime pro state when the local override is enabled", () => {
    const result = normalizeBillingState(null, { lifetimePro: true });

    expect(result.tier).toBe("pro");
    expect(result.limits).toEqual(TIER_LIMITS.pro);
    expect(result.subscription).toEqual({
      productId: "lifetime-pro",
      status: "active",
      currentPeriodEnd: null,
      source: "lifetime",
      isLifetime: true,
    });
  });

  test("returns polar-backed pro state for active subscriptions", () => {
    const result = normalizeBillingState(createCustomerState());

    expect(result.tier).toBe("pro");
    expect(result.limits).toEqual(TIER_LIMITS.pro);
    expect(result.subscription).toEqual({
      productId: "polar-pro",
      status: "active",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
      source: "polar",
      isLifetime: false,
    });
  });

  test("prefers an active Polar subscription over the lifetime override", () => {
    const result = normalizeBillingState(createCustomerState("polar-paid"), {
      lifetimePro: true,
    });

    expect(result.subscription?.source).toBe("polar");
    expect(result.subscription?.isLifetime).toBe(false);
    expect(result.subscription?.productId).toBe("polar-paid");
  });
});
