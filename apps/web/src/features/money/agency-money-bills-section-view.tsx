import { type ReactNode } from "react";
import { FileText, Plus, Receipt, Search, SlidersHorizontal, X } from "lucide-react";

import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import {
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import {
  groupMoneyBillComposeDisplayRows,
  moneyBillComposeHueId,
  moneyBillComposeListInsight,
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillInitials,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { MoneyListGhostPreview } from "./agency-money-shared-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

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

function mergedBillStatusChipClass(statusLabel: string): string {
  switch (statusLabel) {
    case "Mixed":
    case "Part paid":
    case "Partial":
      return "bg-info/10 text-info";
    case "Ready":
      return "bg-elevated text-muted";
    case "Outstanding":
    case "Sent":
      return "bg-warning/10 text-warning";
    case "Paid":
      return "bg-success/10 text-success";
    case "Refunded":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-elevated text-muted";
  }
}

function BillMetricCell({
  label,
  value,
  valueClassName,
  align = "start",
}: {
  label: string;
  value: string;
  valueClassName?: string;
  align?: "start" | "end";
}) {
  return (
    <div className={cn("min-w-0 px-1.5 py-2 sm:px-3", align === "end" && "text-end")}>
      <div className="text-[0.6875rem] font-medium text-muted">{label}</div>
      <div
        className={cn(
          "mt-1 truncate font-mono text-xs font-medium tabular-nums text-highlighted",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function BillMetricGrid({
  totalLabel,
  receivedLabel,
  remainingLabel,
  wasteLabel,
  wasteAmount,
  remainingAmount = 0,
  receivedTitle = "Received",
  ariaLabel,
  compact = false,
}: {
  totalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  wasteLabel: string;
  wasteAmount: number;
  remainingAmount?: number;
  receivedTitle?: string;
  ariaLabel: string;
  compact?: boolean;
}) {
  const showWaste = wasteAmount > 0;
  const remainingUrgent = remainingAmount > 0;
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-default bg-elevated/30",
        compact && "bg-transparent",
      )}
      aria-label={ariaLabel}
    >
      <BillMetricCell label="Total" value={totalLabel} align="end" />
      <BillMetricCell label={receivedTitle} value={receivedLabel} align="end" />
      <BillMetricCell
        label="Remaining"
        value={remainingLabel}
        align="end"
        valueClassName={remainingUrgent ? "text-warning" : "text-muted"}
      />
      <BillMetricCell
        label="Waste"
        value={showWaste ? wasteLabel : "—"}
        align="end"
        valueClassName={showWaste ? "text-destructive/80" : "text-muted"}
      />
    </div>
  );
}

function BillIconAction({
  label,
  onClick,
  disabled,
  children,
  quiet = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Secondary actions: visible on group hover / focus-within. */
  quiet?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "size-9 rounded-lg text-muted hover:text-highlighted",
              quiet &&
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:group-hover/line:opacity-100 sm:group-focus-within/line:opacity-100 sm:focus-visible:opacity-100",
            )}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BillAdjustmentRow({
  row,
  searchTerm,
  pending,
  isMutationPending,
  onOpenPayment,
  onMarkPaid,
}: {
  row: MoneyBillAdjustmentRow;
  searchTerm: string;
  pending: boolean;
  isMutationPending: boolean;
  onOpenPayment: (rowId: string) => void;
  onMarkPaid: (rowId: string) => void;
}) {
  return (
    <li className="group grid items-center gap-3 px-3 py-3 transition-colors hover:bg-elevated/40 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 truncate text-sm font-medium text-highlighted">
            <AgencySearchHighlight text={row.title} query={searchTerm} />
          </span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md px-1.5 text-[0.6875rem] font-medium",
              mergedBillStatusChipClass(row.statusLabel),
            )}
          >
            {row.statusLabel}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          <AgencySearchHighlight text={row.subtitle} query={searchTerm} />
          {row.paidAmount > 0 && row.remainingAmount > 0 ? (
            <>
              <span aria-hidden> · </span>
              {row.paidLabel} paid · {row.remainingLabel} left
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums text-muted">
          {row.metaLabel}
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {row.canRecordPayment ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 min-w-11 rounded-lg"
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
              variant="outline"
              className="h-8 min-w-11 rounded-lg"
              disabled={pending || isMutationPending}
              onClick={() => void onMarkPaid(row.id)}
            >
              Mark paid
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function BillObligationLineRow({
  group,
  line,
  searchTerm,
  isMutationPending,
  onOpenPreviewLine,
  onOpenAdjustLine,
}: {
  group: MoneyBillPersonGroup;
  line: MoneyBillObligationLine;
  searchTerm: string;
  isMutationPending: boolean;
  onOpenPreviewLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
  onOpenAdjustLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
}) {
  const receivedTitle = group.party === "team" ? "Paid" : "Received";
  return (
    <li
      className={cn(
        "group/line grid items-center gap-3 px-3 py-2.5 transition-colors hover:bg-elevated/30 md:grid-cols-[minmax(11rem,0.95fr)_minmax(0,1.8fr)_auto]",
        line.isCarry && "bg-elevated/20",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {line.isCarry ? (
          <span className="mt-0.5 shrink-0 rounded-md bg-elevated px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted">
            Prior
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="min-w-0 truncate text-sm font-medium text-highlighted">
              <AgencySearchHighlight text={line.subtitle} query={searchTerm} />
            </span>
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-md px-1.5 text-[0.6875rem] font-medium",
                mergedBillStatusChipClass(line.statusLabel),
              )}
            >
              {line.statusLabel}
            </span>
          </div>
        </div>
      </div>
      <BillMetricGrid
        totalLabel={line.totalLabel}
        receivedLabel={line.receivedLabel}
        remainingLabel={line.remainingLabel}
        wasteLabel={line.wasteLabel}
        wasteAmount={line.wasteAmount}
        remainingAmount={line.remainingAmount}
        receivedTitle={receivedTitle}
        ariaLabel={`${line.subtitle} money breakdown`}
        compact
      />
      <div className="flex shrink-0 items-center justify-end gap-0.5">
        <BillIconAction
          label={group.party === "team" ? "Preview payslip" : "Preview invoice"}
          disabled={isMutationPending}
          quiet
          onClick={() => onOpenPreviewLine(group, line)}
        >
          <FileText className="size-4" aria-hidden />
        </BillIconAction>
        <BillIconAction
          label="Adjust"
          disabled={isMutationPending}
          quiet
          onClick={() => onOpenAdjustLine(group, line)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </BillIconAction>
      </div>
    </li>
  );
}

function BillPersonGroupCard({
  group,
  searchTerm,
  isMutationPending,
  onOpenClient,
  onOpenMember,
  onOpenPreview,
  onOpenPreviewLine,
  onOpenAdjust,
  onOpenAdjustLine,
}: {
  group: MoneyBillPersonGroup;
  searchTerm: string;
  isMutationPending: boolean;
  onOpenClient: (clientId: string) => void;
  onOpenMember: (userId: string) => void;
  onOpenPreview: (group: MoneyBillPersonGroup) => void;
  onOpenPreviewLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
  onOpenAdjust: (group: MoneyBillPersonGroup) => void;
  onOpenAdjustLine: (group: MoneyBillPersonGroup, line: MoneyBillObligationLine) => void;
}) {
  const hueId = moneyBillComposeHueId(group);
  const receivedTitle = group.party === "team" ? "Paid" : "Received";
  const previewLabel = group.party === "team" ? "Preview payslip" : "Preview invoice";
  const priorLineCount = group.lines.filter((line) => line.isCarry).length;
  const pendingAdjLabel =
    group.pendingAdjustmentCents !== 0
      ? formatMoneyAmount(Math.abs(group.pendingAdjustmentCents), group.currency)
      : null;

  function onOpenParty() {
    if (group.party === "client" && group.clientId) onOpenClient(group.clientId);
    else if (group.party === "team" && group.userId) onOpenMember(group.userId);
  }

  return (
    <li className="group overflow-hidden">
      <div className="grid items-center gap-3 border-b border-default bg-default/40 px-3 py-3 md:grid-cols-[minmax(11rem,0.95fr)_minmax(0,1.8fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          {group.party === "team" ? (
            <AgencyMemberAvatar
              name={group.title}
              userId={group.userId ?? group.id}
              avatarUrl={group.userAvatar}
              size="md"
              className="size-9"
            />
          ) : hueId ? (
            <BillClientMark title={group.title} hueId={hueId} />
          ) : null}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpenParty}
              className={cn(
                "min-w-0 truncate text-left text-sm font-medium text-highlighted hover:underline",
                agencyFocusRingClass,
                "rounded-sm",
              )}
            >
              <AgencySearchHighlight text={group.title} query={searchTerm} />
            </button>
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-mono tabular-nums">{group.openLabel}</span> open
              {priorLineCount > 0 ? (
                <>
                  <span aria-hidden> · </span>
                  {priorLineCount} prior
                </>
              ) : null}
              {pendingAdjLabel ? (
                <>
                  <span aria-hidden> · </span>
                  {group.pendingAdjustmentCents > 0 ? "+" : "−"}
                  {pendingAdjLabel} pending
                </>
              ) : null}
            </p>
          </div>
        </div>
        <BillMetricGrid
          totalLabel={group.totalLabel}
          receivedLabel={group.receivedLabel}
          remainingLabel={group.remainingLabel}
          wasteLabel={group.wasteLabel}
          wasteAmount={group.wasteAmount}
          remainingAmount={group.remainingAmount}
          receivedTitle={receivedTitle}
          ariaLabel={`${group.title} money breakdown`}
        />
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          <BillIconAction
            label={previewLabel}
            disabled={isMutationPending}
            onClick={() => onOpenPreview(group)}
          >
            <FileText className="size-4" aria-hidden />
          </BillIconAction>
          <BillIconAction
            label="Adjust"
            disabled={isMutationPending}
            quiet
            onClick={() => onOpenAdjust(group)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
          </BillIconAction>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {group.lines.map((line) => (
          <BillObligationLineRow
            key={line.id}
            group={group}
            line={line}
            searchTerm={searchTerm}
            isMutationPending={isMutationPending}
            onOpenPreviewLine={onOpenPreviewLine}
            onOpenAdjustLine={onOpenAdjustLine}
          />
        ))}
      </ul>
    </li>
  );
}

function BillsSection({ bills }: { bills: AgencyMoneySurfaceViewModel["bills"] }) {
  const billCountLabel = `${bills.billCount} ${bills.billCount === 1 ? "bill" : "bills"}`;
  const hasStatusFilters = bills.statusOptions.length > 0;
  const create = bills.create;
  const adjustmentCreate = bills.adjustmentCreate;
  const payment = bills.payment;
  const preview = bills.preview;
  const adjust = bills.adjust;
  const showEmpty = !bills.isLoading && !bills.isError && bills.rows.length === 0;
  const sections = groupMoneyBillComposeDisplayRows(bills.rows);
  const insight = moneyBillComposeListInsight(bills.rows);
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
              <div className="flex items-center gap-2 rounded-lg border border-default bg-elevated/40 px-3 py-2">
                <Receipt className="size-3.5 shrink-0 text-muted" aria-hidden />
                <p className="text-xs text-muted">{insight}</p>
              </div>
            ) : null}

            {sections.map((section) => (
              <section key={section.id} className="flex flex-col gap-2" aria-label={section.title}>
                {showSectionHeaders ? (
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <h3 className="text-sm font-medium text-highlighted">{section.title}</h3>
                    <span className="text-xs text-muted">{section.hint}</span>
                  </div>
                ) : null}
                {section.id === "adjustments" ? (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-default">
                    {section.rows.map((row) => {
                      if (row.kind !== "adjustment") return null;
                      const pending = bills.pendingActionInvoiceId === row.id;
                      return (
                        <BillAdjustmentRow
                          key={row.id}
                          row={row}
                          searchTerm={bills.searchTerm}
                          pending={pending}
                          isMutationPending={bills.isMutationPending}
                          onOpenPayment={bills.onOpenPayment}
                          onMarkPaid={bills.onMarkPaid}
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-default">
                    {section.rows.map((row) => {
                      if (row.kind !== "person-group") return null;
                      return (
                        <BillPersonGroupCard
                          key={row.id}
                          group={row}
                          searchTerm={bills.searchTerm}
                          isMutationPending={bills.isMutationPending}
                          onOpenClient={bills.onOpenClient}
                          onOpenMember={bills.onOpenMember}
                          onOpenPreview={bills.onOpenPreview}
                          onOpenPreviewLine={bills.onOpenPreviewLine}
                          onOpenAdjust={bills.onOpenAdjust}
                          onOpenAdjustLine={bills.onOpenAdjustLine}
                        />
                      );
                    })}
                  </ul>
                )}
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

      <Dialog open={preview.open} onOpenChange={preview.onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
              Preview only · not saved
              {preview.periodLabel ? ` · ${preview.periodLabel}` : null}
            </p>
            <DialogTitle>{preview.title}</DialogTitle>
            <DialogDescription>
              Choose lines for {preview.partyTitle}, then export to create the document.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-default bg-elevated/30 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-highlighted">Include lines</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={preview.onSelectAllObligations}
                >
                  {preview.allSelected ? "Clear all" : "Select all"}
                </Button>
              </div>
              <ul className="mt-2 divide-y divide-border">
                {preview.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={line.checked}
                      onCheckedChange={() => preview.onToggleObligationSelect(line.id)}
                      aria-label={`Include ${line.subtitle}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-highlighted">{line.subtitle}</p>
                      <p className="text-xs text-muted">
                        {line.isCarry ? "Prior · " : null}
                        {line.statusLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-highlighted">
                      {line.amountLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-default px-3 py-3">
              <p className="text-sm font-medium text-highlighted">Export shape</p>
              <p className="mt-1 text-xs text-muted">
                How selected periods become persisted documents.
              </p>
              <Tabs
                value={preview.exportMode}
                onValueChange={(value) => preview.onExportModeChange(value as "combine" | "split")}
                className="mt-3"
              >
                <TabsList className="h-9 w-full">
                  <TabsTrigger value="combine" className="flex-1">
                    One document
                  </TabsTrigger>
                  <TabsTrigger value="split" className="flex-1">
                    Split by period
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="rounded-xl border border-default bg-elevated/20 px-3 py-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Selected</span>
                <span className="font-mono tabular-nums text-highlighted">
                  {preview.selectedTotalLabel}
                </span>
              </div>
              {preview.pendingAdjustmentCents !== 0 ? (
                <div className="mt-1 flex justify-between gap-2">
                  <span className="text-muted">Pending adjustments</span>
                  <span className="font-mono tabular-nums text-highlighted">
                    {preview.pendingAdjustmentLabel}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between gap-2 border-t border-default pt-2 font-medium">
                <span className="text-highlighted">Due</span>
                <span className="font-mono tabular-nums text-highlighted">{preview.dueLabel}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={preview.onClose}>
              Close
            </Button>
            <Button
              type="button"
              disabled={!preview.canExport || bills.isMutationPending}
              onClick={preview.onExport}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjust.open} onOpenChange={adjust.onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust {adjust.partyTitle}</DialogTitle>
            <DialogDescription>
              {adjust.lineSubtitle || "Settlement and ledger adjustments"}
              {adjust.statusLabel ? ` · ${adjust.statusLabel}` : null}
            </DialogDescription>
          </DialogHeader>
          {adjust.isReady ? (
            <div className="rounded-lg border border-default bg-elevated/40 px-3 py-2 text-xs text-muted">
              Ready lines create the original-period document first, then record payment.
            </div>
          ) : null}
          <Tabs
            value={adjust.tab}
            onValueChange={(value) => adjust.onTabChange(value as typeof adjust.tab)}
          >
            <TabsList className="h-9 w-full flex-wrap">
              <TabsTrigger value="pay" className="flex-1">
                Pay
              </TabsTrigger>
              <TabsTrigger value="partial" className="flex-1">
                Partial
              </TabsTrigger>
              <TabsTrigger value="refund" className="flex-1">
                Refund
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="flex-1">
                Adjustments
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pay" className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-muted">
                Pay remaining{" "}
                <span className="font-mono text-highlighted">{adjust.remainingLabel}</span>.
              </p>
            </TabsContent>
            <TabsContent value="partial" className="mt-4 flex flex-col gap-3">
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-adjust-amount" className={agencyFormLabelClass}>
                  Amount ({adjust.currency})
                </Label>
                <Input
                  id="money-adjust-amount"
                  inputMode="decimal"
                  value={adjust.amount}
                  onChange={(event) => adjust.onAmountChange(event.target.value)}
                  className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                />
              </div>
            </TabsContent>
            <TabsContent value="refund" className="mt-4">
              <p className="text-sm text-muted">
                Refund this obligation. This changes its bill status.
              </p>
            </TabsContent>
            <TabsContent value="adjustments" className="mt-4 flex flex-col gap-3">
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-adjust-kind" className={agencyFormLabelClass}>
                  Kind
                </Label>
                <Select
                  value={adjust.kind}
                  onValueChange={(value) => adjust.onKindChange(value as typeof adjust.kind)}
                >
                  <SelectTrigger
                    id="money-adjust-kind"
                    className="h-9 w-full rounded-xl border-default bg-default"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="surcharge">Surcharge</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-adjust-adj-amount" className={agencyFormLabelClass}>
                  Amount ({adjust.currency})
                </Label>
                <Input
                  id="money-adjust-adj-amount"
                  inputMode="decimal"
                  value={adjust.amount}
                  onChange={(event) => adjust.onAmountChange(event.target.value)}
                  placeholder="0.00"
                  className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                />
              </div>
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-adjust-note" className={agencyFormLabelClass}>
                  Note
                </Label>
                <Textarea
                  id="money-adjust-note"
                  value={adjust.note}
                  onChange={(event) => adjust.onNoteChange(event.target.value)}
                  placeholder="Shown on the next export"
                  className="min-h-20 rounded-xl border-default bg-default text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => adjust.onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!adjust.canSubmit || bills.isMutationPending}
              onClick={adjust.onSubmit}
            >
              {adjust.tab === "adjustments"
                ? "Save"
                : adjust.tab === "refund"
                  ? "Confirm refund"
                  : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export { BillsSection };
