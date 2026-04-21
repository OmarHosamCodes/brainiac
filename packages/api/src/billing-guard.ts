import { ORPCError, os } from "@orpc/server";
import { db } from "@brainiac/db";
import { user } from "@brainiac/db/schema/auth";
import { env } from "@brainiac/env/server";
import { Polar } from "@polar-sh/sdk";
import { eq } from "drizzle-orm";

import type { Context } from "./context";
import { getFreeBillingState, normalizeBillingState } from "./billing";

const o = os.$context<Context>();

const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

async function getLifetimeProOverride(userId: string) {
  const [existingUser] = await db
    .select({ lifetimePro: user.lifetimePro })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return existingUser?.lifetimePro ?? false;
}

async function getBillingStateForUser(userId: string) {
  const lifetimePro = await getLifetimeProOverride(userId);

  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: userId,
    });
    return normalizeBillingState(customerState, { lifetimePro });
  } catch {
    // User has no Polar customer record (pre-integration signup) — fall back to local billing state.
    return lifetimePro ? normalizeBillingState(null, { lifetimePro }) : getFreeBillingState();
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
