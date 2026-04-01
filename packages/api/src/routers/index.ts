import type { RouterClient } from "@orpc/server";

import { agencyOpsRouter } from "./agency-ops";
import { agentRouter } from "./agent";
import { systemRouter } from "./system";
import { teamRouter } from "./team";
import { workspaceRouter } from "./workspace";

export const appRouter = {
  agent: agentRouter,
  agencyOps: agencyOpsRouter,
  ...systemRouter,
  team: teamRouter,
  workspace: workspaceRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
