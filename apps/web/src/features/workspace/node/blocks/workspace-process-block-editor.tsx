import {
  createWorkspaceProcessStep,
  getProcessSummary,
  type WorkspaceProcessBlock,
} from "@orch/workspace";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

export function WorkspaceProcessBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceProcessBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const summary = useMemo(() => getProcessSummary(block), [block]);

  function addStep() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "process") {
        return;
      }
      entry.steps.push(createWorkspaceProcessStep({ title: `Step ${entry.steps.length + 1}` }));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1 space-y-2">
          <p className="text-sm text-toned">
            {summary.completedSteps}/{summary.totalSteps} complete
          </p>
          <BlockProgressBar value={summary.completedSteps} max={Math.max(summary.totalSteps, 1)} />
        </div>
        {block.steps.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label="Add process step"
            onClick={addStep}
          >
            <Plus />
            Add step
          </Button>
        ) : null}
      </div>

      {block.steps.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No steps yet.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 rounded-full"
            aria-label="Add process step"
            onClick={addStep}
          >
            <Plus />
            Add step
          </Button>
        </div>
      ) : (
        <div className="relative space-y-4 pl-7">
          <div className="absolute top-1 bottom-1 left-[13px] w-px bg-border" />

          {block.steps.map((step, index) => (
            <article key={step.id} className="relative">
              <span
                className={cn(
                  "absolute top-1 -left-[19px] z-10 flex size-5 items-center justify-center rounded-full border bg-background text-[10px] font-semibold",
                  step.completed
                    ? "border-success/50 text-success"
                    : "border-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>

              <div className="rounded-xl border border-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <BlockCheckbox
                      checked={step.completed}
                      aria-label={
                        step.completed
                          ? `Mark step ${index + 1} as incomplete`
                          : `Mark step ${index + 1} as complete`
                      }
                      onCheckedChange={(checked) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "process") {
                            return;
                          }
                          const target = entry.steps.find((candidate) => candidate.id === step.id);
                          if (target) {
                            target.completed = checked;
                          }
                        })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Input
                        value={step.title}
                        placeholder="Step title"
                        className={cn(
                          "w-full border-0 bg-transparent px-0 text-base leading-tight font-semibold shadow-none focus-visible:ring-0",
                          step.completed ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                        onChange={(event) =>
                          mutateBlock(tabId, block.id, (entry) => {
                            if (entry.type !== "process") {
                              return;
                            }
                            const target = entry.steps.find(
                              (candidate) => candidate.id === step.id,
                            );
                            if (target) {
                              target.title = event.target.value.slice(0, 160);
                            }
                          })
                        }
                      />
                      {step.note && expandedStepId !== step.id ? (
                        <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80">
                          {step.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      aria-label={expandedStepId === step.id ? "Collapse notes" : "Expand notes"}
                      onClick={() =>
                        setExpandedStepId((current) => (current === step.id ? null : step.id))
                      }
                    >
                      {expandedStepId === step.id ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove step"
                      onClick={() =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "process") {
                            return;
                          }
                          entry.steps = entry.steps.filter((candidate) => candidate.id !== step.id);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                {expandedStepId === step.id ? (
                  <div className="mt-4 border-t border-muted pt-4">
                    <label
                      htmlFor={`step-note-${step.id}`}
                      className="mb-2 block text-xs font-semibold text-muted-foreground"
                    >
                      Notes
                    </label>
                    <Textarea
                      id={`step-note-${step.id}`}
                      value={step.note}
                      className="rounded-xl"
                      placeholder="Add supporting notes, instructions, or completion criteria..."
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "process") {
                            return;
                          }
                          const target = entry.steps.find((candidate) => candidate.id === step.id);
                          if (target) {
                            target.note = event.target.value.slice(0, 2000);
                          }
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
