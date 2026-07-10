import { z } from "zod";

import type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyProjectTaskStatus,
  AgencyTaskProject,
  AgencyTaskThreadMember,
} from "@brainiac/api/schemas/agency-ops";

export type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyTaskProject,
  AgencyTaskThreadMember,
};

export type TaskStatus = AgencyProjectTaskStatus;

const agencyWorkSurfaceTabSchema = z.enum(["sessions", "my-tasks", "done", "delegated"]);

export type AgencyWorkSurfaceTab = z.infer<typeof agencyWorkSurfaceTabSchema>;

export function parseAgencyWorkSurfaceTab(value: string | null): AgencyWorkSurfaceTab {
  const parsed = agencyWorkSurfaceTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "sessions";
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
