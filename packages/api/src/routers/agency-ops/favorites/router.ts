import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import { listAgencyFavorites, toggleAgencyFavorite } from "./service";

const agencyFavoritesSchema = z.object({
  projectIds: z.array(z.string().min(1)),
  taskIds: z.array(z.string().min(1)),
});

export const favoritesRouter = {
  favorites: {
    list: protectedProProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return agencyFavoritesSchema.parse(await listAgencyFavorites(context.session.user.id, input));
    }),
    toggle: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          kind: z.enum(["project", "task"]),
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyFavoritesSchema
          .extend({ favorited: z.boolean() })
          .parse(await toggleAgencyFavorite(context.session.user.id, input));
      }),
  },
};
