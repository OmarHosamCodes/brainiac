import { AlertTriangle, ListChecks, ListPlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencyProjectTasksQuery } from "@/lib/queries/agency";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyProjectTasksProps = {
  teamId: string;
  projectId: string;
  projectName: string;
};

export function AgencyProjectTasks({ teamId, projectId, projectName }: AgencyProjectTasksProps) {
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const deletingTaskIds = useAgencyOpsStore((s) => s.deletingTaskIds);
  const [titleDraft, setTitleDraft] = useState("");

  const tasksQuery = useAgencyProjectTasksQuery(teamId, { projectId });

  const tasks = tasksQuery.data?.items ?? [];

  async function createTask() {
    const title = titleDraft.trim();
    if (!title || !teamId || !projectId) return;
    setTitleDraft("");
    await agencyOps.createProjectTask({ teamId, projectId, title });
  }

  async function deleteTask(task: { id: string; title: string }) {
    if (!teamId) return;
    await agencyOps.deleteProjectTask({
      teamId,
      taskId: task.id,
      taskTitle: task.title,
    });
  }

  function formatTaskDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <section className="rounded-2xl border border-default bg-default">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Tasks</p>
          <p className="mt-1 truncate text-xs text-muted">{projectName}</p>
        </div>

        <form
          className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            void createTask();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <ListPlus className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Add a task"
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            aria-label="Add task"
            disabled={!titleDraft.trim() || isCreatingTask}
          >
            <Plus />
          </Button>
        </form>
      </header>

      {tasksQuery.isPending ? (
        <div className="divide-y divide-default">
          {[1, 2, 3, 4].map((rowIndex) => (
            <div key={rowIndex} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <div className="px-4 py-8 text-center">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(tasksQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void tasksQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <ListChecks className="mx-auto size-5 text-muted" />
          <p className="mt-3 text-xs text-muted">No tasks yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-default">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="grid grid-cols-[1fr,5rem,2.25rem] items-center gap-3 px-4 py-2.5 text-xs"
            >
              <span className="min-w-0 truncate font-bold text-highlighted">{task.title}</span>
              <span className="font-mono tabular-nums text-muted">
                {formatTaskDate(task.createdAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete task"
                disabled={deletingTaskIds.includes(task.id)}
                onClick={() => void deleteTask(task)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
