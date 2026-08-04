import { clientsRouter } from "./clients/router";
import { projectsRouter } from "./projects/router";
import { projectTemplatesRouter } from "./project-templates/router";
import { favoritesRouter } from "./favorites/router";
import { tasksRouter } from "./tasks/router";
import { timeTrackingRouter } from "./time-tracking/router";
import { tagsRouter } from "./tags/router";
import { departmentsRouter } from "./departments/router";
import { reportsRouter } from "./reports/router";
import { billingRouter } from "./billing/router";
import { resourcingRouter } from "./resourcing/router";
import { integrationsRouter } from "./integrations/router";
import { liveRouter } from "./live/router";
import { memberProfileRouter } from "./member-profile/router";

export const agencyOpsRouter = {
  live: liveRouter.live,
  clients: clientsRouter.clients,
  contacts: clientsRouter.contacts,
  projects: projectsRouter.projects,
  projectTemplates: projectTemplatesRouter.projectTemplates,
  favorites: favoritesRouter.favorites,
  projectTasks: tasksRouter.projectTasks,
  tags: tagsRouter.tags,
  departments: departmentsRouter.departments,
  timer: timeTrackingRouter.timer,
  timeEntries: timeTrackingRouter.timeEntries,
  summary: timeTrackingRouter.summary,
  reports: reportsRouter.reports,
  budgets: billingRouter.budgets,
  rates: billingRouter.rates,
  invoices: billingRouter.invoices,
  capacity: resourcingRouter.capacity,
  leave: resourcingRouter.leave,
  activityHeat: resourcingRouter.activityHeat,
  tenure: resourcingRouter.tenure,
  memberProfile: memberProfileRouter.memberProfile,
  integrations: integrationsRouter.integrations,
};
