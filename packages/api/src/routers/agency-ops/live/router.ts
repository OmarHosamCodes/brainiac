import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import { subscribeAgencyLive } from "./live";

export const liveRouter = {
  live: {
    subscribe: protectedProProcedure.input(teamScopedInputSchema).handler(async function* ({
      context,
      input,
      signal,
    }) {
      yield* subscribeAgencyLive(context.session.user.id, input, signal);
    }),
  },
};
