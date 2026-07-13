import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import { agencyTagSchema, teamScopedInputSchema } from "../shared/schemas";
import { createAgencyTag, deleteAgencyTag, listAgencyTags } from "./service";

export const tagsRouter = {
  tags: {
    list: protectedProProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({ items: z.array(agencyTagSchema) })
        .parse(await listAgencyTags(context.session.user.id, input));
    }),
    create: protectedProProcedure
      .input(teamScopedInputSchema.extend({ name: z.string().trim().min(1).max(50) }))
      .handler(async ({ context, input }) => {
        return agencyTagSchema.parse(await createAgencyTag(context.session.user.id, input));
      }),
    delete: protectedProProcedure
      .input(teamScopedInputSchema.extend({ tagId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return z
          .object({ tagId: z.string().min(1), deleted: z.boolean() })
          .parse(await deleteAgencyTag(context.session.user.id, input));
      }),
  },
};
