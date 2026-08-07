import { type FormEvent, type ReactNode } from "react";
import { CalendarClock, History, List, Plus } from "lucide-react";

import {
  agencyErrorPanelClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import {
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
} from "@/features/billing/money-expense-form";
import { Button } from "@/ui/button";
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
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { MoneyListGhostPreview } from "./agency-money-shared-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

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

export { ExpensesSection };
