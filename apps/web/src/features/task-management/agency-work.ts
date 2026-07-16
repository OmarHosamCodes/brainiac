import type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyProjectTaskStatus,
  AgencyTaskProject,
  AgencyTimeEntry,
} from "@orch/api/schemas/agency-ops";

import type { AgencyMemberOption } from "@/features/shared/agency-member-option";

export type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskKind,
  AgencyProjectTaskStatus,
  AgencyTaskProject,
  AgencyTimeEntry,
};

export type { AgencyMemberOption };

export type TaskStatus = AgencyProjectTaskStatus;

/** Strip obsolete Work tab/task query params so legacy URLs land on the tracker. */
export function normalizeAgencyWorkSurfaceQueryParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  if (!searchParams.has("tab") && !searchParams.has("task") && !searchParams.has("filter")) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.delete("tab");
  next.delete("task");
  next.delete("filter");
  return next;
}

type AgencyWorkSurfaceReadyProps = {
  status: "ready";
  teamId: string;
  projects: AgencyProject[];
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
