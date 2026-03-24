import { db } from "@brainiac/db";
import { dashboardWorkspace } from "@brainiac/db/schema";
import { eq } from "drizzle-orm";
import type { RouterClient } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";

const workspaceNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(4000),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string().max(120).optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  workspace: {
    get: protectedProcedure.handler(async ({ context }) => {
      const [workspace] = await db
        .select({
          nodes: dashboardWorkspace.nodes,
        })
        .from(dashboardWorkspace)
        .where(eq(dashboardWorkspace.userId, context.session.user.id))
        .limit(1);

      return {
        nodes: workspace?.nodes ?? [],
      };
    }),
    save: protectedProcedure
      .input(
        z.object({
          nodes: z.array(workspaceNodeSchema).max(200),
        }),
      )
      .handler(async ({ input, context }) => {
        const now = new Date();

        await db
          .insert(dashboardWorkspace)
          .values({
            userId: context.session.user.id,
            nodes: input.nodes,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: dashboardWorkspace.userId,
            set: {
              nodes: input.nodes,
              updatedAt: now,
            },
          });

        return {
          nodeCount: input.nodes.length,
          savedAt: now.toISOString(),
        };
      }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
