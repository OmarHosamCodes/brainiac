import { z } from "zod";

import type {
  AgencyActiveTimer,
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
} from "@brainiac/api/schemas/agency-ops";

export type {
  AgencyActiveTimer,
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

export const agencyWorkSurfaceTabSchema = z.enum(["sessions", "my-tasks", "done", "delegated"]);

export type AgencyWorkSurfaceTab = z.infer<typeof agencyWorkSurfaceTabSchema>;

export function parseAgencyWorkSurfaceTab(value: string | null): AgencyWorkSurfaceTab {
  const parsed = agencyWorkSurfaceTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "sessions";
}

export type AgencyWorkSurfaceReadyProps = {
  status: "ready";
  teamId: string;
  projects: AgencyProject[];
  activeTab: AgencyWorkSurfaceTab;
  selectedTaskId: string;
  onTabChange: (tab: AgencyWorkSurfaceTab) => void;
  onSelectTask: (taskId: string) => void;
  onAddNewTask: () => void;
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

export function assertAgencyWorkSurfaceViewExhaustive(view: AgencyWorkSurfaceView): void {
  switch (view.status) {
    case "loading":
    case "error":
    case "empty":
    case "ready":
      return;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
