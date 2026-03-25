import type { RouterClient } from "@orpc/server";

import { systemRouter } from "./system";
import { workspaceRouter } from "./workspace";

export const appRouter = {
  ...systemRouter,
  workspace: workspaceRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
