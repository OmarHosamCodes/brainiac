import {
  createWorkspaceOkrKeyResult,
  createWorkspaceOkrObjective,
  getOkrHealth,
  getOkrObjectiveProgress,
  getOkrTrackerSummary,
  type WorkspaceOkrHealth,
  type WorkspaceOkrTrackerBlock,
} from "@brainiac/workspace";
import { Plus, Target, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/components/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function clampProgress(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getHealthClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "border-success/40 bg-success/5";
    case "watch":
      return "border-warning/40 bg-warning/5";
    default:
      return "border-destructive/40 bg-destructive/5";
  }
}

function getHealthTextClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "text-success";
    case "watch":
      return "text-warning";
    default:
      return "text-destructive";
  }
}

export function WorkspaceOkrTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceOkrTrackerBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getOkrTrackerSummary(block), [block]);

  function addObjective() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      entry.objectives.push(
        createWorkspaceOkrObjective({
          keyResults: [createWorkspaceOkrKeyResult()],
        }),
      );
    });
  }

  function addKeyResult(objectiveId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      const objective = entry.objectives.find((item) => item.id === objectiveId);
      if (!objective) {
        return;
      }
      objective.keyResults.push(createWorkspaceOkrKeyResult());
    });
  }

  function removeObjective(objectiveId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      entry.objectives = entry.objectives.filter((objective) => objective.id !== objectiveId);
    });
  }

  function removeKeyResult(objectiveId: string, keyResultId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      const objective = entry.objectives.find((item) => item.id === objectiveId);
      if (!objective) {
        return;
      }
      objective.keyResults = objective.keyResults.filter((keyResult) => keyResult.id !== keyResultId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Average Progress
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {summary.averageProgress}%
          </p>
        </div>

        <div className="rounded-2xl border border-warning/10 bg-warning/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Off Track
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-warning sm:text-2xl">
            {summary.offTrackCount}
          </p>
        </div>

        <div className="rounded-2xl border border-success/10 bg-success/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Healthy
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl">
            {summary.healthyCount}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">Objectives</h2>
          <p className="text-xs text-muted-foreground">
            Track objective health from the average of key results.
          </p>
        </div>

        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={addObjective}>
          <Plus />
          New Objective
        </Button>
      </div>

      {block.objectives.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground/30">
            <Target className="size-6" />
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">No objectives yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Add objectives to track progress and health
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {block.objectives.map((objective) => {
            const progress = getOkrObjectiveProgress(objective);
            const health = getOkrHealth(progress);

            return (
              <article
                key={objective.id}
                className={cn(
                  "overflow-hidden rounded-2xl border border-l-4 border-muted/20 bg-background/40 p-4 transition-colors",
                  getHealthClasses(health),
                )}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={objective.title}
                      placeholder="Objective title"
                      className="border-0 bg-transparent px-0 text-base font-black shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "okr-tracker") {
                            return;
                          }
                          const target = entry.objectives.find(
                            (candidate) => candidate.id === objective.id,
                          );
                          if (!target) {
                            return;
                          }
                          target.title = event.target.value.slice(0, 160);
                        })
                      }
                    />
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {objective.keyResults.length} key result
                      {objective.keyResults.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                        Progress
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-black tracking-tight sm:text-2xl",
                          getHealthTextClasses(health),
                        )}
                      >
                        {progress}%
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove objective"
                      onClick={() => removeObjective(objective.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {objective.keyResults.map((keyResult) => (
                    <div
                      key={keyResult.id}
                      className="rounded-xl border border-muted/20 bg-background/60 p-3"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <Input
                          value={keyResult.title}
                          placeholder="Key result"
                          className="flex-1 border-0 bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0"
                          onChange={(event) =>
                            mutateBlock(tabId, block.id, (entry) => {
                              if (entry.type !== "okr-tracker") {
                                return;
                              }
                              const targetObjective = entry.objectives.find(
                                (candidate) => candidate.id === objective.id,
                              );
                              const targetKeyResult = targetObjective?.keyResults.find(
                                (candidate) => candidate.id === keyResult.id,
                              );
                              if (!targetKeyResult) {
                                return;
                              }
                              targetKeyResult.title = event.target.value.slice(0, 160);
                            })
                          }
                        />

                        <span className="min-w-12 text-right font-mono text-sm font-bold text-primary">
                          {keyResult.progress}%
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove key result"
                          onClick={() => removeKeyResult(objective.id, keyResult.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <BlockProgressBar value={keyResult.progress} max={100} />
                        <div className="flex items-center gap-2">
                          <input
                            id={`kr-progress-${keyResult.id}`}
                            value={keyResult.progress}
                            type="range"
                            min={0}
                            max={100}
                            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted/20 accent-primary"
                            aria-label="Key result progress"
                            onChange={(event) =>
                              mutateBlock(tabId, block.id, (entry) => {
                                if (entry.type !== "okr-tracker") {
                                  return;
                                }
                                const targetObjective = entry.objectives.find(
                                  (candidate) => candidate.id === objective.id,
                                );
                                const targetKeyResult = targetObjective?.keyResults.find(
                                  (candidate) => candidate.id === keyResult.id,
                                );
                                if (!targetKeyResult) {
                                  return;
                                }
                                targetKeyResult.progress = clampProgress(event.target.value);
                              })
                            }
                          />
                          <Input
                            type="number"
                            value={String(keyResult.progress)}
                            className="w-14 rounded-lg text-center text-xs font-mono"
                            onChange={(event) =>
                              mutateBlock(tabId, block.id, (entry) => {
                                if (entry.type !== "okr-tracker") {
                                  return;
                                }
                                const targetObjective = entry.objectives.find(
                                  (candidate) => candidate.id === objective.id,
                                );
                                const targetKeyResult = targetObjective?.keyResults.find(
                                  (candidate) => candidate.id === keyResult.id,
                                );
                                if (!targetKeyResult) {
                                  return;
                                }
                                targetKeyResult.progress = clampProgress(event.target.value);
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addKeyResult(objective.id)}
                  >
                    <Plus />
                    Add Key Result
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
