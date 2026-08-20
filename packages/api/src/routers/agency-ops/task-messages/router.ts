import { protectedProProcedure } from "../../../procedures";
import {
  agencyTaskMessageSchema,
  listTaskMessagesInputSchema,
  listTaskMessagesOutputSchema,
  sendTaskMessageInputSchema,
} from "./schemas";
import { listAgencyTaskMessages, sendAgencyTaskMessage } from "./service";

export const taskMessagesRouter = {
  taskMessages: {
    list: protectedProProcedure
      .input(listTaskMessagesInputSchema)
      .handler(async ({ context, input }) => {
        return listTaskMessagesOutputSchema.parse(
          await listAgencyTaskMessages(context.session.user.id, input),
        );
      }),
    send: protectedProProcedure
      .input(sendTaskMessageInputSchema)
      .handler(async ({ context, input }) => {
        return agencyTaskMessageSchema.parse(
          await sendAgencyTaskMessage(context.session.user.id, input),
        );
      }),
  },
};
