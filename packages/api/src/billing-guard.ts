import { ORPCError, os } from "@orpc/server";
import { env } from "@brainiac/env/server";
import { Polar } from "@polar-sh/sdk";

import type { Context } from "./context";
import { normalizeBillingState } from "./billing";

const o = os.$context<Context>();

const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

async function getBillingStateForUser(userId: string) {
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: userId,
    });
    return normalizeBillingState(customerState);
  } catch {
    // User has no Polar customer record (pre-integration signup) — treat as free
    return normalizeBillingState(null);
  }
}

export const requirePro = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const billing = await getBillingStateForUser(context.session.user.id);

  if (billing.tier !== "pro") {
    throw new ORPCError("FORBIDDEN", {
      message: "This feature requires a Pro subscription",
      data: { requiredTier: "pro", currentTier: billing.tier },
    });
  }

  return next({
    context: { billing },
  });
});

export { getBillingStateForUser };
