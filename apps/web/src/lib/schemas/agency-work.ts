import { z } from "zod";

import type {
  AgencyActiveTimer,
  AgencyProject,
  AgencyProjectTask,
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
  AgencyProjectTask,
  AgencyProjectTaskStatus,
  AgencyTaskMessage,
  AgencyTaskMessageAttachment,
  AgencyTaskProject,
  AgencyTaskThreadMember,
  AgencyTimeEntry,
};

export const agencyWorkMobilePaneSchema = z.enum(["tasks", "time"]);
export type AgencyWorkMobilePane = z.infer<typeof agencyWorkMobilePaneSchema>;

export type TaskStatus = AgencyProjectTaskStatus;

export type AgencyWorkSurfaceReadyProps = {
  status: "ready";
  teamId: string;
  projects: AgencyProject[];
  selectedTaskId: string;
  mobilePane: AgencyWorkMobilePane;
  taskRailCollapsed: boolean;
  mobileTrackingLabel: string | null;
  onSelectTask: (taskId: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectProject: (projectId: string) => void;
  onMobilePaneChange: (pane: AgencyWorkMobilePane) => void;
  onOpenTimePane: () => void;
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

export function assertAgencyWorkSurfaceViewExhaustive(
  view: AgencyWorkSurfaceView,
): void {
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
