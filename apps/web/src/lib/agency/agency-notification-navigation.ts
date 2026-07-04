import type { AgencySegmentId } from "@/lib/agency-segments";
import { useAgencyWorkSurfaceStore } from "@/stores/agency-work-surface";

type OpenAgencyTaskOptions = {
  taskId: string;
  segment: AgencySegmentId;
  searchParams: URLSearchParams;
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void;
};

export function openAgencyTask({
  taskId,
  segment,
  searchParams,
  setSearchParams,
}: OpenAgencyTaskOptions) {
  useAgencyWorkSurfaceStore.getState().setSelectedTaskId(taskId);
  useAgencyWorkSurfaceStore.getState().setMobilePane("thread");

  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("task", taskId);
  next.delete("project");
  next.delete("manage");
  next.delete("pane");

  if (segment !== "work") {
    setSearchParams(next);
    return;
  }

  setSearchParams(next, { replace: true });
}

export function consumeAgencyTaskSearchParam(
  taskParam: string | null,
  segment: AgencySegmentId,
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    options?: { replace?: boolean },
  ) => void,
) {
  if (!taskParam || segment !== "work") return;

  useAgencyWorkSurfaceStore.getState().setSelectedTaskId(taskParam);
  useAgencyWorkSurfaceStore.getState().setMobilePane("thread");

  setSearchParams(
    (current) => {
      const next = new URLSearchParams(current);
      next.delete("task");
      return next;
    },
    { replace: true },
  );
}
