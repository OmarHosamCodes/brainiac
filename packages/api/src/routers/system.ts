import { protectedProcedure, publicProcedure } from "../procedures";
import { z } from "zod";

const healthCheckOutputSchema = z.literal("OK");
const privateDataOutputSchema = z.object({
  message: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
});

export const systemRouter = {
  healthCheck: publicProcedure.handler(() => {
    return healthCheckOutputSchema.parse("OK");
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return privateDataOutputSchema.parse({
      message: "This is private",
      user: {
        id: context.session.user.id,
        name: context.session.user.name,
        email: context.session.user.email,
        image: context.session.user.image,
      },
    });
  }),
};
