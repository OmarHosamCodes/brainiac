export function normalizeAgencyWorkSurfaceTaskSelection(searchParams: URLSearchParams) {
  if (!searchParams.get("task") || searchParams.get("tab") === "tasks") {
    return null;
  }

  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "tasks");
  return next;
}

export function selectAgencyWorkSurfaceTask(searchParams: URLSearchParams, taskId: string) {
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "tasks");
  if (taskId) {
    next.set("task", taskId);
  } else {
    next.delete("task");
  }
  return next;
}

/** Switch to Tasks without opening a task thread. */
export function openAgencyWorkSurfaceTasks(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "tasks");
  next.delete("task");
  return next;
}
