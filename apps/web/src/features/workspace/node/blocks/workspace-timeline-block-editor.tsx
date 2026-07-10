import {
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
  type WorkspaceTimelineBlock,
  type WorkspaceTimelineMilestoneStatus,
} from "@orch/workspace";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Milestone,
  PlayCircle,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const statusLabels: Record<WorkspaceTimelineMilestoneStatus, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
  blocked: "Blocked",
};

const StatusIcons: Record<WorkspaceTimelineMilestoneStatus, typeof Circle> = {
  planned: Circle,
  active: PlayCircle,
  done: CheckCircle2,
  blocked: AlertCircle,
};

function getNextStatus(status: WorkspaceTimelineMilestoneStatus): WorkspaceTimelineMilestoneStatus {
  const currentIndex = WORKSPACE_TIMELINE_MILESTONE_STATUSES.indexOf(status);
  const nextIndex =
    currentIndex < 0 ? 0 : (currentIndex + 1) % WORKSPACE_TIMELINE_MILESTONE_STATUSES.length;
  return WORKSPACE_TIMELINE_MILESTONE_STATUSES[nextIndex] ?? "planned";
}

function toTimelineStatus(value: string): WorkspaceTimelineMilestoneStatus {
  return value === "active" || value === "done" || value === "blocked" ? value : "planned";
}

function getStatusColor(status: WorkspaceTimelineMilestoneStatus) {
  switch (status) {
    case "done":
      return "text-success bg-success/10 border-success/20";
    case "active":
      return "text-primary bg-primary/10 border-primary/20";
    case "blocked":
      return "text-destructive bg-destructive/10 border-destructive/20";
    default:
      return "text-muted-foreground bg-muted/10 border-muted/20";
  }
}

export function WorkspaceTimelineBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTimelineBlock>) {
  const {
    addTimelineMilestone,
    mutateTimelineMilestone,
    removeTimelineMilestone,
    moveTimelineMilestone,
  } = useWorkspaceNodeEditorContext();

  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  const timelineSummary = useMemo(() => {
    const total = block.milestones.length;
    const activeCount = block.milestones.filter(
      (milestone) => milestone.status === "active",
    ).length;
    const doneCount = block.milestones.filter((milestone) => milestone.status === "done").length;
    const blockedCount = block.milestones.filter(
      (milestone) => milestone.status === "blocked",
    ).length;

    return {
      total,
      activeCount,
      doneCount,
      blockedCount,
      completionPercent: Math.round((doneCount / Math.max(total, 1)) * 100),
    };
  }, [block.milestones]);

  function toggleMilestone(id: string) {
    setExpandedMilestoneId((current) => (current === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Milestone Journey
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Chronological project roadmap
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add timeline milestone"
            onClick={() => addTimelineMilestone(tabId, block.id)}
          >
            <Plus />
            Add Milestone
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {timelineSummary.total} milestones
          </Badge>
          <Badge className="rounded-2xl">{timelineSummary.activeCount} active</Badge>
          <Badge variant="success" className="rounded-2xl">
            {timelineSummary.doneCount} done
          </Badge>
          <Badge variant="destructive" className="rounded-2xl">
            {timelineSummary.blockedCount} blocked
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {timelineSummary.completionPercent}% complete
          </Badge>
        </div>
      </div>

      <div className="relative space-y-8 pl-8">
        <div className="absolute top-4 bottom-4 left-[15px] w-0.5 bg-gradient-to-b from-primary/30 via-muted/20 to-transparent" />

        {block.milestones.map((milestone, index) => {
          const StatusIcon = StatusIcons[milestone.status];
          const isExpanded = expandedMilestoneId === milestone.id;

          return (
            <article key={milestone.id} className="group relative">
              <div
                className={cn(
                  "absolute top-0 -left-[21px] z-10 size-5 rounded-full border-2 bg-background transition-all duration-300 group-hover:scale-125",
                  getStatusColor(milestone.status),
                )}
              >
                {milestone.status === "active" ? (
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                ) : null}
              </div>

              <div
                className={cn(
                  "rounded-3xl border border-muted/20 bg-background/40 p-5 transition-all hover:border-primary/20 hover:bg-background/60 hover:shadow-xl hover:shadow-black/5",
                  isExpanded && "ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        {milestone.date || "No Date Set"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "cursor-pointer rounded-lg text-[9px] font-bold uppercase",
                          getStatusColor(milestone.status),
                        )}
                        aria-label={`Cycle status for ${milestone.title || "milestone"}`}
                        onClick={() =>
                          mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                            entry.status = getNextStatus(entry.status);
                          })
                        }
                      >
                        <StatusIcon className="mr-1 size-3" />
                        {statusLabels[milestone.status]}
                      </Badge>
                    </div>

                    <Input
                      value={milestone.title}
                      placeholder="Milestone name..."
                      className="w-full border-0 bg-transparent px-0 text-lg leading-tight font-bold shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                          entry.title = event.target.value.slice(0, 160);
                        })
                      }
                    />

                    {milestone.note && !isExpanded ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {milestone.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-muted-foreground/70 hover:text-foreground"
                      aria-label={isExpanded ? "Hide milestone details" : "Show milestone details"}
                      aria-expanded={isExpanded}
                      onClick={() => toggleMilestone(milestone.id)}
                    >
                      {isExpanded ? <ChevronUp /> : <Settings2 />}
                    </Button>

                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-lg text-muted-foreground/70 hover:text-foreground"
                        disabled={index === 0}
                        aria-label={`Move ${milestone.title || "milestone"} up`}
                        onClick={() => moveTimelineMilestone(tabId, block.id, milestone.id, "up")}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-lg text-muted-foreground/70 hover:text-foreground"
                        disabled={index === block.milestones.length - 1}
                        aria-label={`Move ${milestone.title || "milestone"} down`}
                        onClick={() => moveTimelineMilestone(tabId, block.id, milestone.id, "down")}
                      >
                        <ChevronDown />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-muted-foreground/70 hover:text-destructive"
                      aria-label={`Remove ${milestone.title || "milestone"}`}
                      onClick={() => removeTimelineMilestone(tabId, block.id, milestone.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-6 space-y-6 border-t border-muted/10 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                          Milestone Date
                        </Label>
                        <Input
                          type="date"
                          value={milestone.date ?? ""}
                          className="rounded-xl"
                          onChange={(event) =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.date = event.target.value || null;
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                          Status
                        </Label>
                        <BlockSelect
                          value={milestone.status}
                          options={WORKSPACE_TIMELINE_MILESTONE_STATUSES.map((status) => ({
                            label: statusLabels[status],
                            value: status,
                          }))}
                          className="rounded-xl"
                          onValueChange={(value) =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.status = toTimelineStatus(value);
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                        Supporting Note
                      </Label>
                      <Textarea
                        value={milestone.note}
                        placeholder="Add context, challenges, or success criteria..."
                        className="rounded-2xl text-sm leading-relaxed"
                        onChange={(event) =>
                          mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                            entry.note = event.target.value.slice(0, 2000);
                          })
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}

        {block.milestones.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
            <Milestone className="mx-auto mb-3 size-8 text-muted-foreground/20" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              No milestones defined
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => addTimelineMilestone(tabId, block.id)}
            >
              Create the first one
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
