import { type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Calculator,
  CalendarClock,
  ChevronRight,
  History,
  List,
  Lock,
  Plus,
  Receipt,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { RangePresetChooser } from "@/features/dashboard/agency-dashboard-command-bar";
import { MemberProfileLeaveRangePicker } from "@/features/member-profile/member-profile-leave-range-picker";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencySectionTitleClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  type AgencyMoneySurfaceViewModel,
  type MoneyStatsCardViewModel,
  type MoneyStatsMetricSelection,
} from "./hooks/use-agency-money-surface";
import { type MoneyExpenseKind, type MoneyExpensePeriod } from "./money-expense-form";
import { MoneyPayoutRunView } from "./money-payout-run-view";
import { type MoneyBillsPartyFilter, type MoneyBillsStatusFilter } from "./money-bills-filters";
import {
  type MoneyBillAllocationSegmentId,
  type MoneyBillAllocationView,
} from "./money-bill-allocation";
import {
  groupMoneyBillRows,
  moneyBillHueId,
  moneyBillInitials,
  moneyBillListInsight,
  type MoneyBillRow,
} from "./money-bills-rows";
import {
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricKind,
  type MoneyStatsMetricTone,
} from "./money-stats-fixtures";
import { type MoneyCohortPane } from "./money-cohort-allocations-fixture";
import { MoneyFormulaChipEditorView } from "./money-formula-chip-editor-view";
import { moneyFormulaDestinationSummary, summarizeMoneyFormulaTokens } from "./money-formula-chips";

type AgencyMoneySurfaceViewProps = {
  viewModel: AgencyMoneySurfaceViewModel;
};

function formatMetricValue(kind: MoneyStatsMetricKind, amount: number, currency: string): string {
  if (kind === "percent") {
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toneValueClass(tone: MoneyStatsMetricTone | undefined): string {
  switch (tone) {
    case "positive":
      return "text-success";
    case "caution":
      return "text-warning";
    case "default":
    case undefined:
      return "text-highlighted";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function MetricRowButton({
  card,
  metric,
  value,
  onSelect,
  dense,
}: {
  card: MoneyStatsCardViewModel;
  metric: MoneyStatsMetricFixture;
  value: string;
  onSelect: (selection: MoneyStatsMetricSelection) => void;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group/metric flex w-full items-center gap-2 rounded-xl text-left transition-colors",
        "hover:bg-elevated",
        agencyFocusRingClass,
        dense ? "px-2 py-1.5" : "px-2.5 py-2",
      )}
      onClick={() => onSelect({ cardId: card.id, metricId: metric.id })}
      aria-label={`${metric.label}: ${value}. Open details.`}
    >
      <span className="min-w-0 flex-1 truncate text-xs text-muted">{metric.label}</span>
      <span
        className={cn(
          agencyMetricClass,
          "shrink-0 text-xs font-semibold tabular-nums",
          toneValueClass(metric.tone),
        )}
      >
        {value}
      </span>
      <ChevronRight
        className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover/metric:opacity-100 group-focus-visible/metric:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function StatsCard({
  card,
  onSelectMetric,
}: {
  card: MoneyStatsCardViewModel;
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
}) {
  const primaryValue = formatMetricValue(card.primary.kind, card.primary.amount, card.currency);
  const collectedPct = card.collectedRatio === null ? null : Math.round(card.collectedRatio * 100);

  return (
    <article
      className={cn(
        agencyPanelClass,
        "flex flex-col gap-4 p-5",
        card.featured && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className={cn(agencyLabelClass, "text-muted tracking-wide uppercase")}>{card.title}</h2>
        {card.collectedLabel ? (
          <Badge variant="outline" className="text-muted">
            {card.collectedLabel}
          </Badge>
        ) : null}
      </div>

      <button
        type="button"
        className={cn(
          "group/hero -mx-1 flex flex-col gap-1 rounded-2xl px-1 py-1 text-left transition-colors",
          "hover:bg-elevated/70",
          agencyFocusRingClass,
        )}
        onClick={() => onSelectMetric({ cardId: card.id, metricId: card.primary.id })}
        aria-label={`${card.primary.label}: ${primaryValue}. Open details.`}
      >
        <span className="text-xs font-medium text-muted">{card.primary.label}</span>
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              agencyMetricClass,
              "text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
              toneValueClass(card.primary.tone),
            )}
          >
            {primaryValue}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover/hero:opacity-100 group-focus-visible/hero:opacity-100"
            aria-hidden
          />
        </span>
      </button>

      {collectedPct !== null ? (
        <div className="space-y-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-elevated"
            role="meter"
            aria-label="Share of total income received"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={collectedPct}
          >
            <div
              className="h-full rounded-full bg-success/80 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${collectedPct}%` }}
            />
          </div>
          <div className="flex justify-between gap-3 text-[11px] text-muted">
            <span>Collected</span>
            <span>Outstanding</span>
          </div>
        </div>
      ) : null}

      {card.secondary.length > 0 ? (
        <Collapsible className="border-t border-default pt-3">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-xs">
              Details
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul
              className={cn(
                "flex flex-col gap-0.5 pt-1",
                card.featured && "sm:grid sm:grid-cols-2 sm:gap-x-2 sm:gap-y-0.5",
              )}
            >
              {card.secondary.map((metric) => (
                <li key={metric.id}>
                  <MetricRowButton
                    card={card}
                    metric={metric}
                    value={formatMetricValue(metric.kind, metric.amount, card.currency)}
                    onSelect={onSelectMetric}
                    dense
                  />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </article>
  );
}

function MoneySettingsDialog({
  settings,
}: {
  settings: AgencyMoneySurfaceViewModel["moneySettings"];
}) {
  const paneTitle =
    settings.paneOptions.find((option) => option.id === settings.pane)?.label ?? "Rules";
  const paneDescription =
    settings.paneOptions.find((option) => option.id === settings.pane)?.description ?? "";
  const editor = settings.editor;
  const editingFormula = editor?.kind === "formula";

  return (
    <Dialog open={settings.open} onOpenChange={settings.onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          editingFormula ? "sm:max-w-4xl" : "sm:max-w-3xl",
        )}
      >
        <DialogTitle className="sr-only">{settings.title}</DialogTitle>
        <DialogDescription className="sr-only">{settings.description}</DialogDescription>

        <div className="flex h-[min(36rem,90vh)] overflow-hidden">
          <nav
            className={cn(
              "flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-muted/30 p-3",
              editingFormula && "hidden sm:flex",
            )}
            aria-label="Money settings sections"
          >
            {settings.paneOptions.map((option) => {
              const isActive = settings.pane === option.id && editor == null;
              const Icon = option.id === "rules" ? Users : Calculator;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                    agencyFocusRingClass,
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => settings.onPaneChange(option.id as MoneyCohortPane)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </nav>

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col p-6 pr-14",
              editor?.kind === "formula" ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
            )}
          >
            {settings.status === "loading" ? (
              <div className="flex flex-1 flex-col gap-3 py-4" aria-busy="true">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : settings.status === "error" ? (
              <div className={cn(agencyErrorPanelClass, "my-auto")} role="alert">
                <p className="text-sm font-medium text-highlighted">Couldn’t load Money settings</p>
                <p className="mt-1 text-xs text-muted">{settings.errorMessage}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={settings.onRetry}
                >
                  Retry
                </Button>
              </div>
            ) : editor?.kind === "formula" ? (
              <MoneyFormulaChipEditorView
                formula={editor.formula}
                validationError={settings.formulaValidationError}
                previewLabel={settings.formulaPreviewLabel}
                previewPending={settings.formulaPreviewPending}
                isSaving={settings.isSaving}
                onChange={(formula) => settings.onEditorChange({ kind: "formula", formula })}
                onCancel={settings.onEditorCancel}
                onSave={settings.onEditorSave}
                canSave={settings.canSaveEditor}
                onBack={settings.onEditorCancel}
              />
            ) : editor?.kind === "rule" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit gap-1.5 px-2"
                    onClick={settings.onEditorCancel}
                    disabled={settings.isSaving}
                  >
                    <ArrowLeft className="size-3.5" aria-hidden />
                    Back
                  </Button>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {editor.locked ? (
                        <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
                          {editor.label}
                        </h2>
                      ) : (
                        <Input
                          value={editor.label}
                          onChange={(event) =>
                            settings.onEditorChange({ ...editor, label: event.target.value })
                          }
                          disabled={settings.isSaving}
                          className="h-9 max-w-sm text-lg font-semibold"
                          aria-label="Rule label"
                        />
                      )}
                      {editor.locked ? (
                        <Badge variant="outline" className="text-[0.65rem]">
                          Template
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground text-balance">
                      Edit who this rule applies to, then save.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <Checkbox
                    checked={editor.enabled}
                    onCheckedChange={(checked) =>
                      settings.onEditorChange({ ...editor, enabled: checked === true })
                    }
                    disabled={settings.isSaving}
                    aria-label="Enabled"
                  />
                  Enabled for this team
                </label>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="money-settings-rule-cohort">Cohort</Label>
                    <Input
                      id="money-settings-rule-cohort"
                      value={editor.cohort}
                      onChange={(event) =>
                        settings.onEditorChange({ ...editor, cohort: event.target.value })
                      }
                      placeholder="e.g. All members except interns"
                      disabled={settings.isSaving || !settings.canEdit}
                    />
                  </div>
                  {editor.supportsMemberPick ? (
                    <div className="flex flex-col gap-1.5">
                      <Label>Members</Label>
                      <AgencyMultiSelectFilter
                        label="Members"
                        values={editor.memberIds}
                        options={settings.memberOptions}
                        onValuesChange={(memberIds) =>
                          settings.onEditorChange({ ...editor, memberIds })
                        }
                        disabled={settings.isSaving}
                        searchPlaceholder="Search members"
                      />
                      <p className="text-xs text-muted-foreground">
                        {editor.memberIds.length > 0
                          ? `${editor.memberIds.length} selected`
                          : "Pick who receives this allowance."}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={settings.onEditorCancel}
                    disabled={settings.isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={settings.onEditorSave}
                    disabled={!settings.canSaveEditor || settings.isSaving}
                  >
                    {settings.isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
                      {paneTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground text-balance">{paneDescription}</p>
                  </div>
                  {settings.pane === "formulas" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={settings.onAddCustomFormula}
                      disabled={settings.isSaving || !settings.canEdit}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add formula
                    </Button>
                  ) : settings.pane === "rules" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={settings.onAddCustomRule}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add rule
                    </Button>
                  ) : null}
                </div>

                {settings.pane === "rules" && settings.rules.length === 0 ? (
                  <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-default px-4 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-highlighted">No rules yet</p>
                      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                        Add a rule to define who qualifies for an allocation.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={settings.onAddCustomRule}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add rule
                    </Button>
                  </div>
                ) : settings.pane === "rules" ? (
                  <ul className="mt-6 flex flex-col gap-2">
                    {settings.rules.map((rule) => (
                      <li key={rule.id}>
                        <button
                          type="button"
                          className={cn(
                            "group/rule flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                            rule.enabled
                              ? "border-default hover:bg-elevated"
                              : "border-dashed border-default opacity-70 hover:opacity-100",
                            agencyFocusRingClass,
                          )}
                          onClick={() => settings.onSelect({ kind: "rule", ruleId: rule.id })}
                          aria-label={`Edit ${rule.benefit}`}
                          disabled={settings.isSaving || !settings.canEdit}
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted">
                            <Users className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                                {rule.benefit}
                              </span>
                              {!rule.enabled ? (
                                <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                                  Off
                                </Badge>
                              ) : null}
                              <ChevronRight
                                className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover/rule:opacity-100 group-focus-visible/rule:opacity-100"
                                aria-hidden
                              />
                            </span>
                            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
                              <span className="truncate">{rule.cohort}</span>
                              {rule.memberCount !== null ? (
                                <span className="ml-1.5 shrink-0 tabular-nums text-highlighted">
                                  · {rule.memberCount}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : settings.formulas.length === 0 ? (
                  <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-default px-4 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-highlighted">No formulas yet</p>
                      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                        Add a chip formula to drive a scoreboard metric or payout section amount.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={settings.onAddCustomFormula}
                      disabled={settings.isSaving}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add formula
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-6 flex flex-col gap-2">
                    {settings.formulas.map((formula) => (
                      <li key={formula.id}>
                        <button
                          type="button"
                          className={cn(
                            "group/option flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors duration-150 ease-out motion-reduce:transition-none",
                            formula.enabled
                              ? "border-default hover:bg-elevated"
                              : "border-dashed border-default opacity-70 hover:opacity-100",
                            agencyFocusRingClass,
                          )}
                          onClick={() =>
                            settings.onSelect({ kind: "formula", formulaId: formula.id })
                          }
                          aria-label={`Edit ${formula.label}`}
                          disabled={settings.isSaving || !settings.canEdit}
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted">
                            {formula.locked ? (
                              <Lock className="size-3.5" aria-hidden />
                            ) : (
                              <Calculator className="size-3.5" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                                {formula.label}
                              </span>
                              {!formula.enabled ? (
                                <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                                  Off
                                </Badge>
                              ) : null}
                              <ChevronRight
                                className="size-4 shrink-0 text-muted opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none group-hover/option:opacity-100 group-focus-visible/option:opacity-100"
                                aria-hidden
                              />
                            </span>
                            <span className="mt-1 block truncate font-mono text-xs text-muted">
                              {summarizeMoneyFormulaTokens(formula.tokens)}
                            </span>
                            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs text-muted">
                              <span className="truncate">
                                {moneyFormulaDestinationSummary(formula)}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoneyListGhostPreview({ rows = 3 }: { rows?: number }) {
  const opacities = [0.55, 0.4, 0.28].slice(0, rows);
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {opacities.map((opacity, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-xl border border-default/60 bg-elevated/40 px-3 py-2.5"
          style={{ opacity }}
        >
          <span className="size-7 shrink-0 rounded-full bg-muted/40" />
          <span className="h-2.5 min-w-0 flex-1 rounded-full bg-muted/35" />
          <span className="hidden h-2.5 w-14 shrink-0 rounded-full bg-muted/30 sm:block" />
          <span className="h-2.5 w-10 shrink-0 rounded-full bg-muted/25" />
        </li>
      ))}
    </ul>
  );
}

function BillClientMark({ title, hueId }: { title: string; hueId: string }) {
  return (
    <span
      className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-default text-[0.7rem] font-semibold tracking-wide text-[var(--project-hue)] dark:text-[var(--project-hue-dark)] bg-[var(--project-hue-soft)] dark:bg-[var(--project-hue-soft-dark)]"
      style={projectHueStyle(hueId)}
      aria-hidden
    >
      {moneyBillInitials(title)}
      <span
        className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[var(--project-hue)] dark:bg-[var(--project-hue-dark)] ring-2 ring-default"
        aria-hidden
      />
    </span>
  );
}

function allocationSegmentClass(id: MoneyBillAllocationSegmentId): string {
  switch (id) {
    case "received":
      return "bg-success/80";
    case "remaining":
      return "bg-warning/80";
    case "uninvoiced":
      return "bg-muted-foreground/45";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function MoneyBillAllocationBar({ allocation }: { allocation: MoneyBillAllocationView }) {
  const isActivity = allocation.presentation === "activity";
  return (
    <div className="mt-1.5 min-w-0 space-y-1.5" aria-label={allocation.ariaLabel} role="img">
      <div className={cn("grid gap-2", isActivity ? "grid-cols-1" : "grid-cols-3")}>
        {!isActivity ? (
          <>
            <div className="min-w-0">
              <div className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {allocation.receivedTitle}
              </div>
              <div className="mt-0.5 truncate font-mono text-[0.6875rem] tabular-nums text-success">
                {allocation.receivedLabel}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {allocation.remainingTitle}
              </div>
              <div className="mt-0.5 truncate font-mono text-[0.6875rem] tabular-nums text-warning">
                {allocation.remainingLabel}
              </div>
            </div>
          </>
        ) : null}
        <div className="min-w-0">
          <div className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {allocation.uninvoicedTitle}
          </div>
          <div className="mt-0.5 truncate font-mono text-[0.6875rem] tabular-nums text-foreground/85">
            {allocation.uninvoicedLabel}
          </div>
        </div>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-elevated">
        {allocation.segments.map((segment) => (
          <span
            key={segment.id}
            className={cn("h-full", allocationSegmentClass(segment.id))}
            style={{ width: `${segment.percent}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
          Total {allocation.totalLabel}
        </span>
        {allocation.showWaste ? (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0 items-center rounded-full bg-destructive/10 px-1.5 py-0.5 font-mono text-[0.625rem] text-destructive ring-1 ring-destructive/25">
                  Excluded waste {allocation.wasteLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent>Waste is excluded from billable and payable totals.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
}

function BillListRow({
  row,
  searchTerm,
  pending,
  isMutationPending,
  onOpenClient,
  onOpenMember,
  onCreateInvoiceForClient,
  onCreatePayoutForMember,
  onSend,
  onOpenPayment,
  onMarkPaid,
  onRefund,
}: {
  row: MoneyBillRow;
  searchTerm: string;
  pending: boolean;
  isMutationPending: boolean;
  onOpenClient: (clientId: string) => void;
  onOpenMember: (userId: string) => void;
  onCreateInvoiceForClient: (clientId: string) => void;
  onCreatePayoutForMember: (userId: string) => void;
  onSend: (invoiceId: string) => void;
  onOpenPayment: (rowId: string) => void;
  onMarkPaid: (rowId: string) => void;
  onRefund: (invoiceId: string) => void;
}) {
  const hueId = moneyBillHueId(row);
  const isReady = row.kind === "client-activity" || row.kind === "member-activity";
  const showMemberAvatar =
    row.kind === "member-activity" || (row.kind === "team-payout" && Boolean(row.userId));
  const showStatusChip =
    row.kind === "invoice" || row.kind === "team-payout" || row.kind === "adjustment";

  function onOpenParty() {
    switch (row.kind) {
      case "invoice":
      case "client-activity":
        onOpenClient(row.clientId);
        break;
      case "member-activity":
        onOpenMember(row.userId);
        break;
      case "team-payout":
        if (row.userId) onOpenMember(row.userId);
        break;
      case "adjustment":
        break;
      default: {
        const _exhaustive: never = row;
        void _exhaustive;
      }
    }
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        isReady
          ? "border border-default hover:bg-elevated/50"
          : "border border-transparent hover:border-default hover:bg-elevated/40",
      )}
    >
      {showMemberAvatar ? (
        <AgencyMemberAvatar
          name={row.userName}
          userId={row.userId}
          avatarUrl={row.userAvatar}
          size="md"
          className="size-9"
        />
      ) : hueId ? (
        <BillClientMark title={row.title} hueId={hueId} />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {row.kind === "adjustment" ? (
            <span className="min-w-0 truncate text-sm font-medium text-highlighted">
              <AgencySearchHighlight text={row.title} query={searchTerm} />
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenParty}
              className={cn(
                "min-w-0 truncate text-left text-sm font-medium text-highlighted hover:underline",
                agencyFocusRingClass,
                "rounded-sm",
              )}
            >
              <AgencySearchHighlight text={row.title} query={searchTerm} />
            </button>
          )}
          {showStatusChip ? (
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-md px-1.5 text-[0.65rem] font-medium tracking-wide",
                hueId
                  ? "bg-[var(--project-hue-soft)] text-[var(--project-hue)] dark:bg-[var(--project-hue-soft-dark)] dark:text-[var(--project-hue-dark)]"
                  : "bg-elevated text-muted",
              )}
              style={hueId ? projectHueStyle(hueId) : undefined}
            >
              {row.statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          <AgencySearchHighlight text={row.subtitle} query={searchTerm} />
          {row.kind === "adjustment" && row.paidCents > 0 && row.remainingCents > 0 ? (
            <>
              <span aria-hidden> · </span>
              {row.paidLabel} paid · {row.remainingLabel} left
            </>
          ) : null}
        </p>
        {row.kind === "invoice" ||
        row.kind === "client-activity" ||
        row.kind === "member-activity" ||
        row.kind === "team-payout" ? (
          <MoneyBillAllocationBar allocation={row.allocation} />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            row.kind === "adjustment" ? "text-muted" : "text-highlighted",
          )}
        >
          {row.metaLabel}
        </span>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {row.canCreateInvoice && row.kind === "client-activity" ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg px-3"
              disabled={isMutationPending}
              onClick={() => onCreateInvoiceForClient(row.clientId)}
            >
              Draft invoice
            </Button>
          ) : null}
          {row.canCreatePayout && row.kind === "member-activity" ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg px-3"
              disabled={pending || isMutationPending}
              onClick={() => void onCreatePayoutForMember(row.userId)}
            >
              Draft payout
            </Button>
          ) : null}
          {row.canSend ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={pending || isMutationPending}
              onClick={() => void onSend(row.id)}
            >
              Send
            </Button>
          ) : null}
          {row.canRecordPayment ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={pending || isMutationPending}
              onClick={() => onOpenPayment(row.id)}
            >
              Record payment
            </Button>
          ) : null}
          {row.canMarkPaid ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg"
              disabled={pending || isMutationPending}
              onClick={() => void onMarkPaid(row.id)}
            >
              Mark fully paid
            </Button>
          ) : null}
          {row.canRefund ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              disabled={pending || isMutationPending}
              onClick={() => void onRefund(row.id)}
            >
              Refund
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function BillsSection({ bills }: { bills: AgencyMoneySurfaceViewModel["bills"] }) {
  const billCountLabel = `${bills.billCount} ${bills.billCount === 1 ? "bill" : "bills"}`;
  const hasStatusFilters = bills.statusOptions.length > 0;
  const create = bills.create;
  const adjustmentCreate = bills.adjustmentCreate;
  const payment = bills.payment;
  const showEmpty = !bills.isLoading && !bills.isError && bills.rows.length === 0;
  const sections = groupMoneyBillRows(bills.rows);
  const insight = moneyBillListInsight(bills.rows);
  const showSectionHeaders = sections.length > 1;

  return (
    <section
      className={cn(agencyPanelClass, "flex h-full min-h-0 flex-col overflow-hidden")}
      aria-label="Bills"
    >
      <div className="flex flex-col gap-4 border-b border-default p-5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className={cn(agencyWorkTitleClass, "text-balance")}>Bills</h2>
            {bills.activeFilterSummary ? (
              <span className="text-xs text-muted" aria-live="polite">
                Showing {bills.activeFilterSummary}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1 sm:max-w-72 sm:flex-none">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={bills.searchTerm}
                onChange={(event) => bills.onSearchTermChange(event.target.value)}
                placeholder="Search bills"
                aria-label="Search bills"
                className={cn(
                  "h-9 rounded-xl border-default bg-default pl-9 text-sm",
                  agencyInputPlaceholderClass,
                  bills.searchTerm.trim() ? "text-highlighted" : undefined,
                )}
              />
            </div>
            <span className={cn(agencyMetricClass, "text-xs tabular-nums text-muted")}>
              {billCountLabel}
            </span>
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={bills.onOpenCreate}
                    aria-label="Create invoice"
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Create invoice</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Tabs
          value={bills.partyFilter}
          onValueChange={(value) => bills.onPartyFilterChange(value as MoneyBillsPartyFilter)}
          className="gap-0"
        >
          <TabsList aria-label="Bill party" className="h-9 w-full max-w-full flex-wrap sm:w-fit">
            {bills.partyOptions.map((option) => (
              <TabsTrigger key={option.id} value={option.id} className="px-2.5">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {bills.activeFilterSummary ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Active bill filters"
          >
            {bills.partyFilter !== "all" ? (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-elevated px-2.5 text-xs font-medium text-highlighted ring-1 ring-border">
                {bills.partyOptions.find((option) => option.id === bills.partyFilter)?.label}
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-2 text-muted transition-colors",
                    "hover:bg-default hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={() => bills.onPartyFilterChange("all")}
                  aria-label="Clear party filter"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ) : null}
            {bills.statusFilter ? (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-elevated px-2.5 text-xs font-medium text-highlighted ring-1 ring-border">
                {bills.statusFilter}
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-2 text-muted transition-colors",
                    "hover:bg-default hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={bills.onClearStatusFilter}
                  aria-label="Clear status filter"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ) : null}
            {bills.clientCategoryFilter === "external" ? (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-elevated px-2.5 text-xs font-medium text-highlighted ring-1 ring-border">
                External
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-2 text-muted transition-colors",
                    "hover:bg-default hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={bills.onClearClientCategoryFilter}
                  aria-label="Show internal clients too"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs text-muted"
              onClick={bills.onClearAllFilters}
            >
              Clear all
            </Button>
          </div>
        ) : null}

        {hasStatusFilters ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Bill status"
          >
            {bills.statusOptions.map((option) => {
              const selected = bills.statusFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors",
                    agencyFocusRingClass,
                    selected
                      ? "bg-elevated text-highlighted ring-1 ring-border"
                      : "text-muted hover:bg-elevated/70 hover:text-highlighted",
                  )}
                  onClick={() => bills.onStatusFilterChange(option.id as MoneyBillsStatusFilter)}
                >
                  {option.label}
                </button>
              );
            })}
            {bills.statusFilter ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted"
                onClick={bills.onClearStatusFilter}
                aria-label="Clear status filter"
              >
                <X className="size-3" aria-hidden />
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col pb-5">
        {bills.isLoading ? (
          <div
            className="flex flex-col gap-2 px-4 pt-4"
            aria-busy="true"
            aria-label="Loading bills"
          >
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : null}

        {bills.isError ? (
          <div className={cn(agencyErrorPanelClass, "m-4")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load bills</p>
            <p className="mt-1 text-xs text-muted">{bills.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={bills.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!bills.isLoading && !bills.isError && bills.rows.length > 0 ? (
          <div className="flex flex-col gap-4 px-4 pt-4" aria-label="Bill list">
            {insight ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                <Receipt className="size-3.5 shrink-0 text-primary" aria-hidden />
                <p className="text-xs font-medium text-highlighted">{insight}</p>
              </div>
            ) : null}

            {sections.map((section) => (
              <section
                key={section.id}
                className="flex flex-col gap-1.5"
                aria-label={section.title}
              >
                {showSectionHeaders ? (
                  <div className="flex items-baseline justify-between gap-2 px-1 pt-1">
                    <h3 className="text-xs font-semibold tracking-wide text-highlighted uppercase">
                      {section.title}
                    </h3>
                    <span className="text-[0.7rem] text-muted">{section.hint}</span>
                  </div>
                ) : null}
                <ul className="flex flex-col gap-1">
                  {section.rows.map((row) => (
                    <BillListRow
                      key={row.id}
                      row={row}
                      searchTerm={bills.searchTerm}
                      pending={bills.pendingActionInvoiceId === row.id}
                      isMutationPending={bills.isMutationPending}
                      onOpenClient={bills.onOpenClient}
                      onOpenMember={bills.onOpenMember}
                      onCreateInvoiceForClient={bills.onCreateInvoiceForClient}
                      onCreatePayoutForMember={bills.onCreatePayoutForMember}
                      onSend={bills.onSend}
                      onOpenPayment={bills.onOpenPayment}
                      onMarkPaid={bills.onMarkPaid}
                      onRefund={bills.onRefund}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}

        {showEmpty ? (
          <>
            <div className="px-4 pt-3">
              <MoneyListGhostPreview />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-default to-transparent" />
            <div className="relative z-10 mx-4 mt-1 flex flex-col items-center gap-2 rounded-2xl border border-default bg-default px-5 py-8 text-center">
              <Receipt className="size-6 text-muted" aria-hidden />
              <p className="text-sm font-semibold text-highlighted">
                <AgencySearchHighlight text={bills.emptyCopy.title} query={bills.searchTerm} />
              </p>
              <p className="max-w-sm text-xs text-muted text-balance">
                <AgencySearchHighlight text={bills.emptyCopy.body} query={bills.searchTerm} />
              </p>
            </div>
          </>
        ) : null}
      </div>

      <Dialog open={create.open} onOpenChange={create.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
            <DialogDescription>
              Draft a client invoice from tracked time in the selected period.
            </DialogDescription>
          </DialogHeader>
          <form id={create.formId} className="flex flex-col gap-4" onSubmit={create.onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label className={agencyFormLabelClass}>Client</Label>
              <AgencyMultiSelectFilter
                label="Select client"
                selectionMode="single"
                values={create.clientId ? [create.clientId] : []}
                options={create.clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                onValuesChange={(ids) => create.onClientIdChange(ids[0] ?? "")}
                searchPlaceholder="Search clients"
                triggerClassName="h-10 max-w-none w-full rounded-xl text-sm"
                contentClassName="w-[var(--radix-popover-trigger-width)] min-w-[22rem]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-bill-period" className={agencyFormLabelClass}>
                Period
              </Label>
              <MemberProfileLeaveRangePicker
                triggerId="money-bill-period"
                startDate={create.periodStart}
                endDate={create.periodEnd}
                emptyLabel="Select invoice period"
                ariaLabel="Invoice period"
                onRangeChange={(next) => {
                  create.onPeriodStartChange(next.startDate);
                  create.onPeriodEndChange(next.endDate);
                }}
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => create.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={create.formId} disabled={!create.canSubmit}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentCreate.open} onOpenChange={adjustmentCreate.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add adjustment</DialogTitle>
            <DialogDescription>
              Create a Debt/Discount, Charity, or PBC line for this period.
            </DialogDescription>
          </DialogHeader>
          <form
            id={adjustmentCreate.formId}
            className="flex flex-col gap-4"
            onSubmit={adjustmentCreate.onSubmit}
          >
            <div className={agencyFormFieldClass}>
              <Label
                htmlFor={`${adjustmentCreate.formId}-section`}
                className={agencyFormLabelClass}
              >
                Section
              </Label>
              <Select
                value={adjustmentCreate.sectionKey}
                onValueChange={(value) =>
                  adjustmentCreate.onSectionKeyChange(
                    value as (typeof adjustmentCreate.sectionOptions)[number]["id"],
                  )
                }
              >
                <SelectTrigger
                  id={`${adjustmentCreate.formId}-section`}
                  className="h-9 w-full rounded-xl border-default bg-default"
                >
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentCreate.sectionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor={`${adjustmentCreate.formId}-label`} className={agencyFormLabelClass}>
                Label
              </Label>
              <Input
                id={`${adjustmentCreate.formId}-label`}
                value={adjustmentCreate.label}
                onChange={(event) => adjustmentCreate.onLabelChange(event.target.value)}
                placeholder="e.g. Client discount, donation"
                className="h-9 rounded-xl border-default bg-default text-sm"
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor={`${adjustmentCreate.formId}-amount`} className={agencyFormLabelClass}>
                Amount
              </Label>
              <Input
                id={`${adjustmentCreate.formId}-amount`}
                inputMode="decimal"
                value={adjustmentCreate.amount}
                onChange={(event) => adjustmentCreate.onAmountChange(event.target.value)}
                placeholder="0.00"
                className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
              />
            </div>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => adjustmentCreate.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={adjustmentCreate.formId}
              disabled={!adjustmentCreate.canSubmit}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {payment.partyName} · {payment.referenceLabel}. Remaining {payment.remainingLabel}.
            </DialogDescription>
          </DialogHeader>
          <form id={payment.formId} className="flex flex-col gap-4" onSubmit={payment.onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-bill-payment-amount" className={agencyFormLabelClass}>
                Amount ({payment.currency})
              </Label>
              <Input
                id="money-bill-payment-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={payment.amount}
                onChange={(event) => payment.onAmountChange(event.target.value)}
                className={agencyFormFieldClass}
                aria-invalid={Boolean(payment.validationMessage)}
                aria-describedby={
                  payment.validationMessage ? "money-bill-payment-amount-error" : undefined
                }
              />
              {payment.validationMessage ? (
                <p
                  id="money-bill-payment-amount-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {payment.validationMessage}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => payment.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={payment.formId} disabled={!payment.canSubmit}>
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type ExpensesGroupViewModel =
  | AgencyMoneySurfaceViewModel["expenses"]["upcoming"]
  | AgencyMoneySurfaceViewModel["expenses"]["recent"];

function ExpensesSection({ expenses }: { expenses: AgencyMoneySurfaceViewModel["expenses"] }) {
  const create = expenses.create;
  const details = expenses.details;
  const payment = expenses.payment;

  return (
    <section
      className={cn(agencyPanelClass, "flex h-full min-h-0 flex-col overflow-hidden")}
      aria-label="Expenses"
    >
      <div className="flex items-start justify-between gap-3 border-b border-default p-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={cn(agencyWorkTitleClass, "text-balance")}>{expenses.title}</h2>
          <p className="text-xs text-muted text-balance">{expenses.subtitle}</p>
        </div>
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 rounded-xl"
                onClick={expenses.onOpenCreate}
                aria-label="Add expense"
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add expense</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex flex-1 flex-col">
        {expenses.status === "loading" ? (
          <div className="flex flex-col gap-3 p-5" aria-busy="true">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : expenses.status === "error" ? (
          <div className={cn(agencyErrorPanelClass, "m-5")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load expenses</p>
            <p className="mt-1 text-xs text-muted">{expenses.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={expenses.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <ExpensesGroup
              group={expenses.upcoming}
              icon={<CalendarClock className="size-4 text-muted" aria-hidden />}
              ghostRows={2}
              onOpenDetails={expenses.onOpenDetails}
            />
            <div className="mx-5 border-t border-default" />
            <ExpensesGroup
              group={expenses.recent}
              icon={<History className="size-4 text-muted" aria-hidden />}
              ghostRows={2}
              grow
              onOpenDetails={expenses.onOpenDetails}
            />
          </>
        )}
      </div>

      <Dialog open={details.open} onOpenChange={details.onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-1 border-b border-default px-5 py-4 pr-14 text-left">
            <DialogTitle className="text-base font-bold text-highlighted">
              {details.title}
            </DialogTitle>
            <p className="text-xs text-muted">
              {details.totalCount === 0
                ? "Nothing logged yet"
                : `${details.totalCount} ${details.totalCount === 1 ? "expense" : "expenses"}`}
            </p>
          </DialogHeader>

          <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-4">
            {details.totalCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-default px-4 py-8 text-center">
                <p className="text-sm font-semibold text-highlighted">{details.emptyTitle}</p>
                <p className="mt-1 text-xs text-muted text-balance">{details.emptyBody}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {details.sections.map((section) => (
                  <div key={section.id} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className={cn(agencyLabelClass, "text-muted tracking-wide uppercase")}>
                        {section.title}
                      </h3>
                      <span className={cn(agencyMetricClass, "text-xs tabular-nums text-muted")}>
                        {section.items.length}
                      </span>
                    </div>
                    {section.items.length === 0 ? (
                      <p className="text-xs text-muted">None in this group.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl border border-default bg-elevated/30 px-3 py-2.5"
                          >
                            <span
                              className="mt-0.5 size-7 shrink-0 rounded-full bg-muted/40"
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                                <p className="truncate text-sm font-medium text-highlighted">
                                  {item.name}
                                </p>
                                <span className="shrink-0 text-[11px] tabular-nums text-highlighted">
                                  {item.amountLabel}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                                <span>{item.meta}</span>
                                <span aria-hidden>·</span>
                                <span>{item.statusLabel}</span>
                                {item.canRecordPayment ? (
                                  <>
                                    <span aria-hidden>·</span>
                                    <button
                                      type="button"
                                      className="font-medium text-highlighted underline-offset-2 hover:underline"
                                      onClick={() => expenses.onOpenPayment(item.id)}
                                    >
                                      Record payment
                                    </button>
                                  </>
                                ) : null}
                              </div>
                              {item.note ? (
                                <p className="mt-0.5 text-xs text-muted text-pretty">{item.note}</p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => details.onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                details.onOpenChange(false);
                expenses.onOpenCreate();
              }}
            >
              Add expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={create.open} onOpenChange={create.onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
            <DialogTitle className="text-base font-bold text-highlighted">Add expense</DialogTitle>
          </DialogHeader>

          <form
            id={create.formId}
            onSubmit={(event: FormEvent<HTMLFormElement>) => create.onSubmit(event)}
          >
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className={agencyFormFieldClass}>
                <Label htmlFor={`${create.formId}-name`} className={agencyFormLabelClass}>
                  Name
                </Label>
                <Input
                  id={`${create.formId}-name`}
                  value={create.name}
                  onChange={(event) => create.onNameChange(event.target.value)}
                  placeholder="e.g. Notion, office rent"
                  autoFocus
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>

              <div className={agencyFormFieldClass}>
                <Label htmlFor={`${create.formId}-kind`} className={agencyFormLabelClass}>
                  Type
                </Label>
                <Select
                  value={create.kind}
                  onValueChange={(value) => create.onKindChange(value as MoneyExpenseKind)}
                >
                  <SelectTrigger
                    id={`${create.formId}-kind`}
                    className="h-9 w-full rounded-xl border-default bg-default"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {create.kindOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {create.kind === "subscription" ? (
                <div className={agencyFormFieldClass}>
                  <Label htmlFor={`${create.formId}-period`} className={agencyFormLabelClass}>
                    Period
                  </Label>
                  <Select
                    value={create.period ?? undefined}
                    onValueChange={(value) => create.onPeriodChange(value as MoneyExpensePeriod)}
                  >
                    <SelectTrigger
                      id={`${create.formId}-period`}
                      className="h-9 w-full rounded-xl border-default bg-default"
                    >
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {create.periodOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className={agencyFormFieldClass}>
                <Label htmlFor={`${create.formId}-amount`} className={agencyFormLabelClass}>
                  Amount
                </Label>
                <Input
                  id={`${create.formId}-amount`}
                  inputMode="decimal"
                  value={create.amount}
                  onChange={(event) => create.onAmountChange(event.target.value)}
                  placeholder="0.00"
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm tabular-nums",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>

              <div className={agencyFormFieldClass}>
                <Label htmlFor={`${create.formId}-note`} className={agencyFormLabelClass}>
                  Note <span className="font-normal text-muted">(optional)</span>
                </Label>
                <Textarea
                  id={`${create.formId}-note`}
                  value={create.note}
                  onChange={(event) => create.onNoteChange(event.target.value)}
                  placeholder="Anything to remember about this expense"
                  rows={3}
                  className={cn(
                    "min-h-20 rounded-xl border-default bg-default text-sm",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => create.onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!create.canSubmit} form={create.formId}>
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
            <DialogTitle className="text-base font-bold text-highlighted">
              Record expense payment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              {payment.name}
              {payment.remainingLabel ? ` · ${payment.remainingLabel} remaining` : null}
            </DialogDescription>
          </DialogHeader>
          <form
            id={payment.formId}
            onSubmit={(event: FormEvent<HTMLFormElement>) => payment.onSubmit(event)}
          >
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-expense-payment-amount" className={agencyFormLabelClass}>
                  Amount ({payment.currency})
                </Label>
                <Input
                  id="money-expense-payment-amount"
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(event) => payment.onAmountChange(event.target.value)}
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm tabular-nums",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>
            <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => payment.onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!payment.canSubmit} form={payment.formId}>
                Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ExpensesGroup({
  group,
  icon,
  ghostRows,
  grow,
  onOpenDetails,
}: {
  group: ExpensesGroupViewModel;
  icon: ReactNode;
  ghostRows: number;
  grow?: boolean;
  onOpenDetails: () => void;
}) {
  const hasItems = group.items.length > 0;

  return (
    <div className={cn("flex flex-col gap-3 p-5", grow && "flex-1")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <div className="min-w-0">
            <h3 className={cn(agencyWorkTitleClass, "text-xs")}>{group.title}</h3>
            <p className="text-[11px] text-muted">{group.hint}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={cn(agencyMetricClass, "text-xs tabular-nums text-muted")}>
            {group.countLabel}
          </span>
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-lg text-muted"
                  onClick={onOpenDetails}
                  aria-label={`View all expenses from ${group.title}`}
                >
                  <List className="size-3.5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">All expenses</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {hasItems ? (
        <ul className="flex flex-col gap-2">
          {group.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-default bg-elevated/30 px-3 py-2.5"
            >
              <span className="mt-0.5 size-7 shrink-0 rounded-full bg-muted/40" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="truncate text-sm font-medium text-highlighted">{item.name}</p>
                  <span className="shrink-0 text-[11px] tabular-nums text-highlighted">
                    {item.amountLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted">{item.meta}</p>
                {item.note ? (
                  <p className="mt-0.5 truncate text-xs text-muted">{item.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative flex flex-col">
          <MoneyListGhostPreview rows={ghostRows} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-default to-transparent" />
          <div className="relative z-10 -mt-1 flex items-start gap-3 rounded-2xl border border-default bg-default px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-highlighted">{group.emptyTitle}</p>
              <p className="mt-0.5 text-xs text-muted text-balance">{group.emptyBody}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AgencyMoneySurfaceView({ viewModel }: AgencyMoneySurfaceViewProps) {
  const {
    title,
    subtitle,
    period,
    statsCards,
    onSelectMetric,
    moneySettings,
    bills,
    expenses,
    payoutRun,
    isOwner,
    isRolePending,
    scoreboardStatus,
    scoreboardErrorMessage,
    onRetryScoreboard,
  } = viewModel;

  if (isRolePending) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6" aria-busy="true">
        <Skeleton className="h-8 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>{title}</h1>
          {subtitle ? (
            <p className={cn(agencyLabelClass, "text-muted-foreground max-w-xl text-balance")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && moneySettings.onOpen ? (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-xl"
                    onClick={moneySettings.onOpen}
                    aria-label="Money settings"
                  >
                    <Settings className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Money settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <RangePresetChooser
            value={period.rangePreset}
            onChange={period.onRangePresetChange}
            tenureAvailable={period.tenureAvailable}
            tenurePeriodLabel={period.tenurePeriodLabel}
            tenureQuarterLabel={period.tenureQuarterLabel}
            tenureQuarterMonths={period.tenureQuarterMonths}
            tenureMonthIndexes={period.tenureMonthIndexes}
            onTenureMonthIndexesChange={period.onTenureMonthIndexesChange}
          />
          {period.rangePreset === "custom" ? (
            <MemberProfileLeaveRangePicker
              triggerId="money-period-custom-range"
              startDate={period.customFromDate}
              endDate={period.customToDate}
              emptyLabel="Select period dates"
              ariaLabel="Custom period date range"
              triggerClassName="h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs"
              onRangeChange={(next) => {
                period.onCustomFromChange(next.startDate);
                period.onCustomToChange(next.endDate);
              }}
            />
          ) : null}
        </div>
      </header>

      {!isOwner ? (
        <section
          className={cn(agencyPanelClass, "flex flex-col gap-1 p-6")}
          aria-label="Money access"
        >
          <h2 className="text-base font-semibold text-highlighted">Owners manage Money</h2>
          <p className="text-sm text-muted">
            Ask a team owner to review bills, payouts, expenses, and Money settings.
          </p>
        </section>
      ) : (
        <>
          {scoreboardStatus === "loading" ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-48 rounded-2xl" />
              ))}
            </section>
          ) : scoreboardStatus === "error" ? (
            <section className={agencyErrorPanelClass} role="alert">
              <p className="text-sm font-medium text-highlighted">
                Couldn’t load the period scoreboard
              </p>
              <p className="mt-1 text-xs text-muted">{scoreboardErrorMessage}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onRetryScoreboard}
              >
                Retry
              </Button>
            </section>
          ) : (
            <section
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Money period stats"
            >
              {statsCards.map((card) => (
                <StatsCard key={card.id} card={card} onSelectMetric={onSelectMetric} />
              ))}
            </section>
          )}

          <MoneyPayoutRunView viewModel={payoutRun} />

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]">
            <BillsSection bills={bills} />
            <ExpensesSection expenses={expenses} />
          </div>

          <MoneySettingsDialog settings={moneySettings} />
        </>
      )}
    </div>
  );
}
