import type { RouterClient } from "@orpc/server";

import { agencyOpsRouter } from "./agency-ops";
import { agentRouter } from "./agent/router";
import { billingRouter } from "./billing/router";
import { notificationsRouter } from "./notifications/router";
import { systemRouter } from "./system";
import { teamRouter } from "./team/router";
import { workspaceRouter } from "./workspace/router";

export const appRouter = {
  agent: agentRouter,
  agencyOps: agencyOpsRouter,
  billing: billingRouter,
  notifications: notificationsRouter,
  ...systemRouter,
  team: teamRouter,
  workspace: workspaceRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
