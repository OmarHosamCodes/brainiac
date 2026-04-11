import { env } from "@brainiac/env/server";
import { Polar } from "@polar-sh/sdk";

import { normalizeBillingState } from "../../billing";
import { protectedProcedure } from "../../procedures";

const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

export const billingRouter = {
  state: protectedProcedure.handler(async ({ context }) => {
    try {
      const customerState = await polar.customers.getStateExternal({
        externalId: context.session.user.id,
      });
      return normalizeBillingState(customerState);
    } catch {
      return normalizeBillingState(null);
    }
  }),
};
