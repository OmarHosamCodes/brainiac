import { z } from "zod";

import type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyProjectTaskStatus,
  AgencyTaskMessage,
  AgencyTaskMessageAttachment,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  AgencyTimeEntry,
} from "@orch/api/schemas/agency-ops";

export type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyProjectTaskStatus,
  AgencyTaskMessage,
  AgencyTaskMessageAttachment,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  AgencyTimeEntry,
};

export type TaskStatus = AgencyProjectTaskStatus;

const agencyWorkSurfaceTabSchema = z.enum(["sessions", "tasks"]);

const legacyAgencyWorkSurfaceTabSchema = z.enum(["my-tasks", "done", "delegated"]);

export type AgencyWorkSurfaceTab = z.infer<typeof agencyWorkSurfaceTabSchema>;

export function parseAgencyWorkSurfaceTab(value: string | null): AgencyWorkSurfaceTab {
  if (legacyAgencyWorkSurfaceTabSchema.safeParse(value).success) {
    return "tasks";
  }
  const parsed = agencyWorkSurfaceTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "sessions";
}

/** Rewrite legacy My Tasks / Done / Delegated tab query values to `tasks`. */
export function normalizeAgencyWorkSurfaceTabParam(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  const tab = searchParams.get("tab");
  if (!legacyAgencyWorkSurfaceTabSchema.safeParse(tab).success) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "tasks");
  return next;
}

type AgencyWorkSurfaceReadyProps = {
  status: "ready";
  teamId: string;
  projects: AgencyProject[];
  activeTab: AgencyWorkSurfaceTab;
  selectedTaskId: string;
  onTabChange: (tab: AgencyWorkSurfaceTab) => void;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

export type AgencyWorkSurfaceView =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | {
      status: "empty";
      onGoToClients: () => void;
      onGoToProjects: () => void;
    }
  | AgencyWorkSurfaceReadyProps;
