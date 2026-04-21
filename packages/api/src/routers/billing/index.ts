import { getBillingStateForUser } from "../../billing-guard";
import { protectedProcedure } from "../../procedures";

export const billingRouter = {
  state: protectedProcedure.handler(async ({ context }) => {
    return getBillingStateForUser(context.session.user.id);
  }),
};
