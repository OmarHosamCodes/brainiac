import {
  createWorkspaceProcessStep,
  getProcessSummary,
  type WorkspaceProcessBlock,
} from "@brainiac/workspace";
import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { BlockProgressBar } from "@/components/workspace/node/blocks/shared/block-progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-muted/20 bg-background/40 p-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Progress
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {summary.completedSteps}/{summary.totalSteps}
            </p>
            <Badge variant="secondary" className="rounded-lg">
              {summary.percent}%
            </Badge>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <BlockProgressBar value={summary.completedSteps} max={Math.max(summary.totalSteps, 1)} />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={addStep}
        >
          <Plus />
          Add Step
        </Button>
      </div>

      <div className="relative space-y-4 pl-7">
        <div className="absolute top-1 bottom-1 left-[13px] w-0.5 bg-gradient-to-b from-primary/30 via-muted/20 to-transparent" />

        {block.steps.map((step, index) => (
          <article key={step.id} className="relative">
            <button
              type="button"
              id={`step-toggle-${step.id}`}
              className={cn(
                "absolute top-1 -left-[19px] z-10 flex size-5 items-center justify-center rounded-full border-2 bg-background text-[10px] font-black transition-transform hover:scale-110 focus:ring-2 focus:ring-primary/50 focus:outline-none",
                step.completed
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
              aria-label={`Step ${index + 1}: ${step.completed ? "Mark as incomplete" : "Mark as complete"}`}
              onClick={() =>
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== "process") {
                    return;
                  }
                  const target = entry.steps.find((candidate) => candidate.id === step.id);
                  if (target) {
                    target.completed = !target.completed;
                  }
                })
              }
            >
              {index + 1}
            </button>

            <div className="rounded-2xl border border-muted/20 bg-background/40 p-4 transition-all hover:border-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    value={step.title}
                    placeholder="Step title"
                    className={cn(
                      "w-full border-0 bg-transparent px-0 text-base leading-tight font-black shadow-none focus-visible:ring-0",
                      step.completed ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                    onChange={(event) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "process") {
                          return;
                        }
                        const target = entry.steps.find((candidate) => candidate.id === step.id);
                        if (target) {
                          target.title = event.target.value.slice(0, 160);
                        }
                      })
                    }
                  />
                  {step.note && expandedStepId !== step.id ? (
                    <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80">{step.note}</p>
                  ) : null}
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
                <div className="mt-4 border-t border-muted/10 pt-4">
                  <label
                    htmlFor={`step-note-${step.id}`}
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
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

        {block.steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground/30">
              <ListChecks className="size-6" />
            </div>
            <p className="mt-3 text-xs font-bold text-muted-foreground">No steps yet</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Add steps to build your process
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
