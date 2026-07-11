export function normalizeAgencyWorkSurfaceTaskSelection(searchParams: URLSearchParams) {
  if (!searchParams.get("task") || searchParams.get("tab") === "my-tasks") {
    return null;
  }

  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "my-tasks");
  return next;
}

export function selectAgencyWorkSurfaceTask(searchParams: URLSearchParams, taskId: string) {
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "my-tasks");
  if (taskId) {
    next.set("task", taskId);
  } else {
    next.delete("task");
  }
  return next;
}
