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

/** Switch to My Tasks without opening a task thread. */
export function openAgencyWorkSurfaceMyTasks(searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams);
  next.set("section", "work");
  next.set("tab", "my-tasks");
  next.delete("task");
  return next;
}
