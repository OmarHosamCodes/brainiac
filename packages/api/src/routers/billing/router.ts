import { protectedProcedure } from "../../procedures";
import { billingStateSchema } from "./schemas";
import { getSubscriptionBillingState } from "./service";

export const billingRouter = {
  state: protectedProcedure.handler(async ({ context }) => {
    return billingStateSchema.parse(
      await getSubscriptionBillingState(context.session.user.id, {}),
    );
  }),
};
