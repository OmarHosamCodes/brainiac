import {
  createWorkspaceCohortHealthCohort,
  getCohortFillPercent,
  getCohortHealth,
  getCohortHealthSummary,
  workspaceCohortStatusLabels,
  type WorkspaceCohortHealthDashboardBlock,
  type WorkspaceCohortStatus,
} from "@brainiac/workspace";
import { Plus, Trash2, Users } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const statusOptions: WorkspaceCohortStatus[] = ["planning", "selling", "running", "completed"];

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toPositiveInt(value: string | number | null | undefined, fallback: number) {
  const numeric = Number(value ?? fallback);
  return Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : fallback));
}

function getHealthClasses(health: ReturnType<typeof getCohortHealth>) {
  switch (health) {
    case "healthy":
      return "border-success/30 bg-success/5 text-success";
    case "watch":
      return "border-warning/30 bg-warning/5 text-warning";
    default:
      return "border-destructive/30 bg-destructive/5 text-destructive";
  }
}

function getHealthBadgeVariant(health: ReturnType<typeof getCohortHealth>) {
  switch (health) {
    case "healthy":
      return "success" as const;
    case "watch":
      return "warning" as const;
    default:
      return "destructive" as const;
  }
}

export function WorkspaceCohortHealthDashboardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCohortHealthDashboardBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getCohortHealthSummary(block), [block]);

  function mutateCohort(
    cohortId: string,
    mutator: (cohort: WorkspaceCohortHealthDashboardBlock["cohorts"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      const cohort = entry.cohorts.find((candidate) => candidate.id === cohortId);
      if (cohort) {
        mutator(cohort);
      }
    });
  }

  function addCohort() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      entry.cohorts.push(
        createWorkspaceCohortHealthCohort({
          name: "New cohort",
          capacity: 20,
          seatsSold: 0,
          status: "planning",
        }),
      );
    });
  }

  function removeCohort(cohortId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      entry.cohorts = entry.cohorts.filter((cohort) => cohort.id !== cohortId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Seats Sold
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {summary.totalSeatsSold}
          </p>
        </div>

        <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
            Capacity Filled
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl">
            {summary.fillPercent}%
          </p>
        </div>

        <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/80">
            Booked Revenue
          </p>
          <p className="mt-2 font-mono text-lg font-black tracking-tight text-secondary sm:text-xl">
            {formatCurrency(summary.bookedRevenueEgp)}
          </p>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive/70">
            At Risk
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-destructive sm:text-2xl">
            {summary.atRiskCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">
            Cohort Health Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Track fill rate, revenue, and delivery risk per cohort.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={addCohort}
        >
          <Plus />
          Add Cohort
        </Button>
      </div>

      {block.cohorts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground/30">
            <Users className="size-6" />
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">No cohorts tracked yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {block.cohorts.map((cohort) => {
            const health = getCohortHealth(cohort);
            const fillPercent = getCohortFillPercent(cohort);

            return (
              <article
                key={cohort.id}
                className={cn("rounded-2xl border p-4 transition-colors", getHealthClasses(health))}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Input
                        value={cohort.name}
                        placeholder="Cohort name"
                        className="min-w-[12rem] flex-1 border-0 bg-transparent px-0 text-base font-black text-foreground shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.name = event.target.value.slice(0, 120);
                          })
                        }
                      />

                      <Badge variant={getHealthBadgeVariant(health)} className="rounded-lg px-3">
                        {health}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      <span>
                        {cohort.seatsSold}/{cohort.capacity} seats
                      </span>
                      <span>{fillPercent}% full</span>
                      <span className="font-mono">{formatCurrency(cohort.revenueEgp)}</span>
                      {cohort.startDate ? <span>Starts {cohort.startDate}</span> : null}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        <span>Fill Rate</span>
                        <span>{fillPercent}%</span>
                      </div>
                      <BlockProgressBar
                        value={cohort.seatsSold}
                        max={Math.max(cohort.capacity, 1)}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove cohort"
                    onClick={() => removeCohort(cohort.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor={`sold-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                      >
                        Seats Sold
                      </Label>
                      <Input
                        id={`sold-${cohort.id}`}
                        type="number"
                        value={String(cohort.seatsSold)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.seatsSold = Math.min(
                              toPositiveInt(event.target.value, entry.seatsSold),
                              Math.max(entry.capacity, 0),
                            );
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`capacity-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                      >
                        Capacity
                      </Label>
                      <Input
                        id={`capacity-${cohort.id}`}
                        type="number"
                        value={String(cohort.capacity)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.capacity = Math.max(
                              1,
                              toPositiveInt(event.target.value, entry.capacity),
                            );
                            entry.seatsSold = Math.min(entry.seatsSold, entry.capacity);
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`revenue-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                      >
                        Revenue (EGP)
                      </Label>
                      <Input
                        id={`revenue-${cohort.id}`}
                        type="number"
                        value={String(cohort.revenueEgp)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.revenueEgp = toPositiveInt(event.target.value, entry.revenueEgp);
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`start-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                      >
                        Start Date
                      </Label>
                      <Input
                        id={`start-${cohort.id}`}
                        type="date"
                        value={cohort.startDate ?? ""}
                        className="rounded-xl"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.startDate = event.target.value || null;
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-muted/20 bg-background/40 p-3">
                    <div>
                      <BlockFieldLabel className="mb-2 block">Status</BlockFieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {statusOptions.map((status) => (
                          <Button
                            key={`${cohort.id}-${status}`}
                            type="button"
                            size="sm"
                            variant={cohort.status === status ? "secondary" : "ghost"}
                            className="rounded-full px-3"
                            onClick={() =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.status = status;
                              })
                            }
                          >
                            {workspaceCohortStatusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <BlockFieldLabel>Risk Flags</BlockFieldLabel>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2.5 rounded-lg border border-muted/20 bg-muted/10 px-3 py-2">
                          <BlockCheckbox
                            checked={cohort.refundRisk}
                            aria-label="Refund risk"
                            onCheckedChange={(checked) =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.refundRisk = checked;
                              })
                            }
                          />
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                            Refund
                          </span>
                        </label>

                        <label className="flex items-center gap-2.5 rounded-lg border border-muted/20 bg-muted/10 px-3 py-2">
                          <BlockCheckbox
                            checked={cohort.completionRisk}
                            aria-label="Completion risk"
                            onCheckedChange={(checked) =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.completionRisk = checked;
                              })
                            }
                          />
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                            Completion
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {cohort.refundRisk ? (
                        <Badge variant="destructive" className="rounded-lg px-2.5 py-0.5">
                          Refund exposure
                        </Badge>
                      ) : null}
                      {cohort.completionRisk ? (
                        <Badge variant="warning" className="rounded-lg px-2.5 py-0.5">
                          Completion risk
                        </Badge>
                      ) : null}
                      {!cohort.refundRisk && !cohort.completionRisk ? (
                        <Badge variant="success" className="rounded-lg px-2.5 py-0.5">
                          No risks
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
