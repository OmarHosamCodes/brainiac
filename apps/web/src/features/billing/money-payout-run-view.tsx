import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import {
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  formatPayoutRunSectionMeta,
  groupPayoutLinesByCohort,
  moneyPayoutRunStatusLabel,
  type MoneyPayoutRunLine,
  type MoneyPayoutRunSection,
  type MoneyPayoutRunStatus,
} from "./money-payout-run";
import { formatMoneyAmount } from "./money-bills-rows";

export type MoneyPayoutRunViewModel = {
  title: string;
  subtitle: string;
  status: MoneyPayoutRunStatus;
  currency: string;
  periodLabel: string;
  sections: MoneyPayoutRunSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  selectedSectionLines: MoneyPayoutRunLine[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  linesStatus: "loading" | "error" | "ready" | "idle";
  onOpenPayment: ((lineId: string) => void) | null;
  onMarkPaid: ((lineId: string) => void) | null;
  onAddLine: (() => void) | null;
  onOpenTeamBills: (() => void) | null;
  onSyncFormulaLines: (() => void) | null;
  isMutationPending: boolean;
};

export function MoneyPayoutRunView({ viewModel }: { viewModel: MoneyPayoutRunViewModel }) {
  const selected = viewModel.sections.find((section) => section.id === viewModel.selectedSectionId);
  const cohortGroups = groupPayoutLinesByCohort(viewModel.selectedSectionLines);

  return (
    <section
      className={cn(agencyPanelClass, "flex min-h-0 flex-col overflow-hidden")}
      aria-label="Payout run"
      id="money-period-run"
    >
      <div className="flex items-start justify-between gap-3 border-b border-default p-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={cn(agencyWorkTitleClass, "text-balance")}>{viewModel.title}</h2>
          <p className="text-xs text-muted text-balance">{viewModel.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-md bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted">
            {moneyPayoutRunStatusLabel(viewModel.status)}
          </span>
          <span className={cn(agencyMetricClass, "text-xs tabular-nums text-muted")}>
            {viewModel.periodLabel}
          </span>
          {viewModel.onSyncFormulaLines ? (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={viewModel.isMutationPending}
                    onClick={viewModel.onSyncFormulaLines}
                  >
                    {viewModel.isMutationPending ? "Syncing…" : "Sync formula lines"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-56 text-pretty">
                  Apply enabled formula amounts to unpaid draft lines. Paid lines stay untouched.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3">
        {viewModel.isLoading ? (
          <p className="px-2 py-4 text-xs text-muted">Loading run…</p>
        ) : viewModel.isError ? (
          <div className="px-2 py-4" role="alert">
            <p className="text-xs text-muted">{viewModel.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={viewModel.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : viewModel.sections.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted">No payout sections yet.</p>
        ) : (
          viewModel.sections.map((section) => {
            const open = viewModel.selectedSectionId === section.id;
            return (
              <div key={section.id} className="rounded-xl border border-transparent">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-elevated/50",
                    open && "bg-elevated/40",
                  )}
                  onClick={() => viewModel.onSelectSection(open ? null : section.id)}
                >
                  {open ? (
                    <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-highlighted">{section.title}</p>
                    <p className="truncate text-[11px] text-muted">
                      {formatPayoutRunSectionMeta(section, viewModel.currency)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-highlighted">
                    {formatMoneyAmount(section.dueAmount, viewModel.currency)}
                  </span>
                </button>

                {open && selected ? (
                  <div className="border-t border-default px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className={cn(agencyLabelClass, "text-muted")}>
                        {selected.key === "salaries" ? "Estimated from hours × cost rate" : "Lines"}
                      </p>
                      <div className="flex items-center gap-1">
                        {selected.key === "salaries" && viewModel.onOpenTeamBills ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-lg px-2 text-xs"
                            onClick={viewModel.onOpenTeamBills}
                          >
                            Open Team Bills
                          </Button>
                        ) : null}
                        {selected.key !== "salaries" && viewModel.onAddLine ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg px-2 text-xs"
                            onClick={viewModel.onAddLine}
                          >
                            <Plus className="size-3.5" aria-hidden />
                            Add line
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {viewModel.linesStatus === "loading" ? (
                      <p className="text-xs text-muted">Loading lines…</p>
                    ) : viewModel.linesStatus === "error" ? (
                      <div className="text-xs text-muted" role="alert">
                        Couldn’t load this section.{" "}
                        <button type="button" className="underline" onClick={viewModel.onRetry}>
                          Retry
                        </button>
                      </div>
                    ) : cohortGroups.length === 0 ? (
                      <p className="text-xs text-muted">No lines in this section.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {cohortGroups.map((group) => (
                          <div key={group.title} className="flex flex-col gap-1.5">
                            {cohortGroups.length > 1 || group.cohortKey ? (
                              <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
                                {group.title}
                              </p>
                            ) : null}
                            <ul className="flex flex-col gap-1">
                              {group.lines.map((line) => (
                                <li
                                  key={line.id}
                                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-elevated/40"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-highlighted">
                                      {line.label || line.userName}
                                    </p>
                                    <p className="text-[11px] text-muted capitalize">
                                      {line.status}
                                    </p>
                                  </div>
                                  <span className="shrink-0 font-mono text-xs tabular-nums text-highlighted">
                                    {formatMoneyAmount(line.amount, line.currency)}
                                  </span>
                                  {line.canRecordPayment && viewModel.onOpenPayment ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 rounded-lg px-2 text-xs"
                                      disabled={viewModel.isMutationPending}
                                      onClick={() => viewModel.onOpenPayment?.(line.id)}
                                    >
                                      Record payment
                                    </Button>
                                  ) : null}
                                  {line.canMarkPaid && viewModel.onMarkPaid ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 rounded-lg px-2 text-xs"
                                      disabled={viewModel.isMutationPending}
                                      onClick={() => viewModel.onMarkPaid?.(line.id)}
                                    >
                                      Mark fully paid
                                    </Button>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
