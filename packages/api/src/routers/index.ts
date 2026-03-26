import type { RouterClient } from "@orpc/server";

import { agentRouter } from "./agent";
import { systemRouter } from "./system";
import { workspaceRouter } from "./workspace";

export const appRouter = {
  agent: agentRouter,
  ...systemRouter,
  workspace: workspaceRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
