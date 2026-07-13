import { clientsRouter } from "./clients/router";
import { projectsRouter } from "./projects/router";
import { tasksRouter } from "./tasks/router";
import { timeTrackingRouter } from "./time-tracking/router";
import { tagsRouter } from "./tags/router";
import { reportsRouter } from "./reports/router";
import { billingRouter } from "./billing/router";
import { resourcingRouter } from "./resourcing/router";
import { integrationsRouter } from "./integrations/router";
import { liveRouter } from "./live/router";

export const agencyOpsRouter = {
  live: liveRouter.live,
  clients: clientsRouter.clients,
  contacts: clientsRouter.contacts,
  projects: projectsRouter.projects,
  projectTasks: tasksRouter.projectTasks,
  taskThreads: tasksRouter.taskThreads,
  taskAgent: tasksRouter.taskAgent,
  tags: tagsRouter.tags,
  timer: timeTrackingRouter.timer,
  timeEntries: timeTrackingRouter.timeEntries,
  summary: timeTrackingRouter.summary,
  reports: reportsRouter.reports,
  budgets: billingRouter.budgets,
  rates: billingRouter.rates,
  invoices: billingRouter.invoices,
  capacity: resourcingRouter.capacity,
  tenure: resourcingRouter.tenure,
  integrations: integrationsRouter.integrations,
};
