import { LayoutGroup } from "motion/react";
import { ChevronDown, FileText, Plus, Receipt, Search, SlidersHorizontal, X } from "lucide-react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import {
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import {
  moneyBillComposeListInsight,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { MoneyListGhostPreview } from "./agency-money-shared-view";
import { MoneyExpensesPanelContent } from "./agency-money-expenses-section-view";
import { AgencyMoneyBillsDialogs } from "./agency-money-bills-dialogs-view";
import { AgencyMoneyBillsTablesView } from "./agency-money-bills-tables-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import {
  moneyPanelHeaderClass,
  MoneyPanelCount,
  MoneyPanelFilterPill,
  MoneyPanelFilterRow,
  MoneyPanelMetricBlock,
  MoneyPanelTitleRow,
  MoneyPeriodFxLine,
} from "./money-panel-chrome";

function ActiveBillFilterChip({
  label,
  clearLabel,
  onClear,
}: {
  label: string;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-0.5 rounded-full bg-elevated py-0 pl-2.5 pr-0.5 text-xs font-medium text-highlighted ring-1 ring-border">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150",
          "hover:bg-default hover:text-highlighted",
          "motion-reduce:transition-none",
          agencyFocusRingClass,
        )}
        onClick={onClear}
        aria-label={clearLabel}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

function BillInstrumentRowSkeleton() {
  return (
    <li className="flex items-center gap-3 border-t border-default px-3 py-3 first:border-t-0">
      <Skeleton className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>
      <Skeleton className="h-10 w-[5.5rem] shrink-0 rounded-lg" />
    </li>
  );
}

function MoneyBillsCreateMenu({
  onOpenInvoice,
  onOpenAdjustment,
  onOpenExpense,
}: {
  onOpenInvoice: () => void;
  onOpenAdjustment: () => void;
  onOpenExpense: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-xl px-3 sm:h-9"
          aria-label="Add"
        >
          <Plus className="size-4" aria-hidden />
          <span>Add</span>
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenInvoice, 0)}>
          <FileText className="size-4" aria-hidden />
          Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenAdjustment, 0)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Adjustment
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenExpense, 0)}>
          <Receipt className="size-4" aria-hidden />
          Expense
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BillsSection({
  bills,
  periodFx,
}: {
  bills: AgencyMoneySurfaceViewModel["bills"];
  periodFx: AgencyMoneySurfaceViewModel["periodFx"];
}) {
  const isExpensesParty = bills.partyFilter === "expenses";
  const panelTitle = isExpensesParty ? "Expenses" : "Bills";
  const expensesPanel = bills.expensesPanel;
  const expenseCountLabel =
    expensesPanel.strip.itemCount === 1 ? "1 expense" : `${expensesPanel.strip.itemCount} expenses`;
  const billCountLabel = `${bills.billCount} ${bills.billCount === 1 ? "bill" : "bills"}`;
  const countLabel = isExpensesParty ? expenseCountLabel : billCountLabel;
  const hasStatusFilters = !isExpensesParty && bills.statusOptions.length > 0;
  const hasExpenseFilters = isExpensesParty && expensesPanel.status === "ready";
  const showEmpty =
    !isExpensesParty &&
    !bills.isLoading &&
    !bills.isError &&
    bills.rows.length === 0 &&
    !bills.salaryPool.pool;
  const emptyAction =
    bills.partyFilter === "adjustments" || bills.partyFilter === "team"
      ? { label: "Add adjustment or cost", onClick: bills.createMenu.onOpenAdjustment }
      : { label: "Create invoice", onClick: bills.createMenu.onOpenInvoice };
  const sections = bills.displaySections;
  const insight = isExpensesParty
    ? expensesPanel.strip.insight
    : moneyBillComposeListInsight(bills.rows);

  function onOpenParty(row: MoneyBillPersonGroup) {
    if (row.party === "client" && row.clientId) {
      bills.onOpenClient(row.clientId);
      return;
    }
    if (row.party === "team" && row.userId) bills.onOpenMember(row.userId);
  }

  return (
    <section
      className={cn(agencyPanelClass, "flex shrink-0 flex-col overflow-hidden")}
      aria-labelledby="money-bills-panel-heading"
    >
      <div className={moneyPanelHeaderClass}>
        <MoneyPanelTitleRow
          title={panelTitle}
          headingId="money-bills-panel-heading"
          headingTabIndex={-1}
        >
          <div className="relative min-w-48 flex-1 sm:max-w-72 sm:flex-none">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={bills.searchTerm}
              onChange={(event) => bills.onSearchTermChange(event.target.value)}
              placeholder={isExpensesParty ? "Search expenses" : "Search bills"}
              aria-label={isExpensesParty ? "Search expenses" : "Search bills"}
              className={cn(
                "h-9 rounded-xl border-default bg-default pl-9 text-sm",
                agencyInputPlaceholderClass,
                bills.searchTerm.trim() ? "text-highlighted" : undefined,
              )}
            />
          </div>
          {isExpensesParty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg px-2 text-xs text-muted sm:h-8"
              onClick={() => expensesPanel.details.onOpenChange(true)}
            >
              All expenses
            </Button>
          ) : (
            <MoneyPanelCount>{countLabel}</MoneyPanelCount>
          )}
          <MoneyBillsCreateMenu
            onOpenInvoice={bills.createMenu.onOpenInvoice}
            onOpenAdjustment={bills.createMenu.onOpenAdjustment}
            onOpenExpense={bills.createMenu.onOpenExpense}
          />
        </MoneyPanelTitleRow>

        <MoneyPeriodFxLine
          label={periodFx.label}
          canApplyCurrent={periodFx.canApplyCurrent}
          applying={periodFx.applying}
          onApplyCurrent={periodFx.onApplyCurrent}
        />

        {isExpensesParty && expensesPanel.periodSpendLabel ? (
          <MoneyPanelMetricBlock
            label="Period spend"
            value={expensesPanel.periodSpendLabel}
            hint={insight}
          />
        ) : !isExpensesParty && bills.remainingLabel ? (
          <MoneyPanelMetricBlock label="Remaining" value={bills.remainingLabel} hint={insight} />
        ) : insight ? (
          <p className="text-xs text-muted text-balance" aria-live="polite">
            {insight}
          </p>
        ) : null}

        <LayoutGroup id="bills-party-filters">
          <MoneyPanelFilterRow label="Bill party">
            {bills.partyOptions.map((option) => (
              <MoneyPanelFilterPill
                key={option.id}
                label={option.label}
                selected={bills.partyFilter === option.id}
                onSelect={() => bills.onPartyFilterChange(option.id as MoneyBillsPartyFilter)}
                layoutId="bills-party-filter-bg"
              />
            ))}
          </MoneyPanelFilterRow>
        </LayoutGroup>

        {hasExpenseFilters ? (
          <LayoutGroup id="expense-strip-filters">
            <MoneyPanelFilterRow label="Expense filters">
              {expensesPanel.strip.filterOptions.map((option) => (
                <MoneyPanelFilterPill
                  key={option.id}
                  label={option.label}
                  selected={expensesPanel.strip.filter === option.id}
                  onSelect={() => expensesPanel.strip.onFilterChange(option.id)}
                  layoutId="expense-strip-filter-bg"
                />
              ))}
            </MoneyPanelFilterRow>
          </LayoutGroup>
        ) : null}

        {hasStatusFilters || (!isExpensesParty && bills.clientCategoryFilter === "external") ? (
          <div className="flex flex-col gap-2">
            {hasStatusFilters ? (
              <LayoutGroup id="bills-status-filters">
                <MoneyPanelFilterRow label="Bill status">
                  {bills.statusOptions.map((option) => (
                    <MoneyPanelFilterPill
                      key={option.id}
                      label={option.label}
                      selected={bills.statusFilter === option.id}
                      onSelect={() =>
                        bills.onStatusFilterChange(option.id as MoneyBillsStatusFilter)
                      }
                      layoutId="bills-status-filter-bg"
                    />
                  ))}
                </MoneyPanelFilterRow>
              </LayoutGroup>
            ) : null}

            {!isExpensesParty && bills.clientCategoryFilter === "external" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ActiveBillFilterChip
                  label="External"
                  clearLabel="Show internal clients too"
                  onClear={bills.onClearClientCategoryFilter}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-col pb-5">
        {isExpensesParty ? (
          <MoneyExpensesPanelContent panel={expensesPanel} searchTerm={bills.searchTerm} />
        ) : null}

        {!isExpensesParty && bills.isLoading ? (
          <ul
            className="mx-4 mt-4 divide-y divide-border overflow-hidden rounded-xl border border-default"
            aria-busy="true"
            aria-label="Loading bills"
          >
            {[1, 2, 3].map((item) => (
              <BillInstrumentRowSkeleton key={item} />
            ))}
          </ul>
        ) : null}

        {!isExpensesParty && bills.isError ? (
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

        {!isExpensesParty &&
        !bills.isLoading &&
        !bills.isError &&
        (bills.rows.length > 0 || bills.salaryPool.pool) ? (
          <AgencyMoneyBillsTablesView
            sections={sections}
            salaryPool={bills.salaryPool}
            searchTerm={bills.searchTerm}
            isMutationPending={bills.isMutationPending}
            onOpenRow={() => undefined}
            onOpenParty={onOpenParty}
            onOpenSalaryPool={() => undefined}
          />
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
              {!bills.searchTerm.trim() ? (
                <Button type="button" size="sm" className="mt-1" onClick={emptyAction.onClick}>
                  {emptyAction.label}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <AgencyMoneyBillsDialogs bills={bills} />
    </section>
  );
}

export { BillsSection };
