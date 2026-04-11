import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { getBillingStateForUser } from "./billing-guard";
import { toProcedureError } from "./dev-errors";

export const o = os.$context<Context>();

const devErrorMiddleware = o.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw toProcedureError("rpc.procedure", error);
  }
});

export const publicProcedure = o.use(devErrorMiddleware);

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requirePro = o.middleware(async ({ context, next }) => {
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

export const protectedProProcedure = protectedProcedure.use(requirePro);
