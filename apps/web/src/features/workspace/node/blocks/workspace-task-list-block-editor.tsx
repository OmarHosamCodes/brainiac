import {
  getTaskListProgress,
  type WorkspaceTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskListBlock,
  type WorkspaceTaskPriority,
} from "@brainiac/workspace";
import { Calendar, ChevronUp, Clock, Plus, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function toTaskPriority(value: string): WorkspaceTaskPriority | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function toTaskDomain(value: string): WorkspaceTaskDomain | null {
  const validDomains = [
    "strategy",
    "people",
    "sales",
    "content",
    "brand",
    "finance",
    "education",
    "orchestrator",
  ];
  return validDomains.includes(value) ? (value as WorkspaceTaskDomain) : null;
}

function clampTenPointScale(value: string) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampEstimate(value: string) {
  const numeric = Number(value || 0);
  return Math.min(1440, Math.max(0, Math.round(numeric)));
}

export function WorkspaceTaskListBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTaskListBlock>) {
  const { priorityOptions, domainOptions, addTask, mutateTask, removeTask, getPriorityBadgeClass } =
    useWorkspaceNodeEditorContext();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const progress = useMemo(() => getTaskListProgress(block), [block]);
  const openTaskCount = block.tasks.filter((task) => !task.completed).length;

  function toggleTask(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function updateTask(taskId: string, mutator: (task: WorkspaceTask) => void) {
    mutateTask(tabId, block.id, taskId, mutator);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="text-xl font-black tracking-tight sm:text-2xl">
                {Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Task progress
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-2xl">
                  {progress.completed} completed
                </Badge>
                <Badge variant="secondary" className="rounded-2xl">
                  {openTaskCount} open
                </Badge>
                <Badge variant="secondary" className="rounded-2xl">
                  {progress.total} total
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            {progress.completed} / {progress.total}
          </p>
        </div>

        <BlockProgressBar value={progress.completed} max={Math.max(progress.total, 1)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Tasks
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            {openTaskCount} open
          </p>
        </div>

        {block.tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "group flex flex-col overflow-hidden rounded-2xl border border-muted/20 bg-background/40 transition-all hover:border-primary/20 hover:bg-background/60",
              expandedTaskId === task.id && "ring-1 ring-primary/30",
            )}
          >
            <div className="flex items-center gap-3 p-3">
              <BlockCheckbox
                checked={task.completed}
                className="size-5"
                aria-label={task.completed ? "Mark task as open" : "Mark task as complete"}
                onCheckedChange={(checked) =>
                  updateTask(task.id, (entry) => {
                    entry.completed = checked;
                  })
                }
              />

              <Input
                value={task.text}
                placeholder="What needs to be done?"
                className="flex-1 border-0 bg-transparent px-0 font-medium text-foreground shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  updateTask(task.id, (entry) => {
                    entry.text = event.target.value.slice(0, 240);
                  })
                }
              />

              <div className="flex items-center gap-1">
                {task.priority ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-lg text-[9px] font-bold uppercase tracking-wider",
                      getPriorityBadgeClass(task.priority),
                    )}
                  >
                    {task.priority}
                  </Badge>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  aria-label={
                    expandedTaskId === task.id ? "Hide task details" : "Show task details"
                  }
                  onClick={() => toggleTask(task.id)}
                >
                  {expandedTaskId === task.id ? <ChevronUp /> : <Settings2 />}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg hover:text-destructive"
                  aria-label="Delete task"
                  onClick={() => removeTask(tabId, block.id, task.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {expandedTaskId === task.id ? (
              <div className="grid gap-6 border-t border-muted/10 bg-muted/5 p-5 transition-all lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <BlockFieldLabel>Due Date</BlockFieldLabel>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={task.dueDate ?? ""}
                        className="rounded-xl pl-10"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.dueDate = event.target.value || null;
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <BlockFieldLabel>Priority</BlockFieldLabel>
                      <BlockSelect
                        value={task.priority ?? ""}
                        options={priorityOptions}
                        onValueChange={(value) =>
                          updateTask(task.id, (entry) => {
                            entry.priority = toTaskPriority(value);
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <BlockFieldLabel>Domain</BlockFieldLabel>
                      <BlockSelect
                        value={task.domain ?? ""}
                        options={domainOptions}
                        onValueChange={(value) =>
                          updateTask(task.id, (entry) => {
                            entry.domain = toTaskDomain(value);
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <BlockFieldLabel>Urgency</BlockFieldLabel>
                        <span className="text-xs font-black text-primary">{task.urgency}</span>
                      </div>
                      <input
                        value={task.urgency}
                        type="range"
                        min={1}
                        max={10}
                        className="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.urgency = clampTenPointScale(event.target.value);
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <BlockFieldLabel>Importance</BlockFieldLabel>
                        <span className="text-xs font-black text-primary">{task.importance}</span>
                      </div>
                      <input
                        value={task.importance}
                        type="range"
                        min={1}
                        max={10}
                        className="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.importance = clampTenPointScale(event.target.value);
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <BlockFieldLabel>Estimate (min)</BlockFieldLabel>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={String(task.estimateMinutes)}
                        className="rounded-xl pl-10 font-mono font-bold"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.estimateMinutes = clampEstimate(event.target.value);
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {block.tasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              No tasks added yet
            </p>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-2xl py-3 text-sm font-bold shadow-sm"
        onClick={() => addTask(tabId, block.id)}
      >
        <Plus />
        Add task
      </Button>
    </div>
  );
}
