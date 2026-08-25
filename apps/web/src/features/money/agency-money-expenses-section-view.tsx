import { type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import {
  moneyExpensePeriodLabel,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
} from "@/features/billing/money-expense-form";
import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { expenseStripMeta, type ExpenseStripItem } from "@/features/money/money-expenses-strip";
import { ExpenseStripGlyph } from "@/features/money/money-expense-strip-glyphs";
import {
  moneyBaseTransition,
  moneyExpenseStripItemVariants,
} from "@/features/money/money-motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Separator } from "@/ui/separator";
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

const expenseStripRowClass =
  "group/row flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-elevated/25 focus-within:bg-elevated/25 motion-reduce:transition-none";

function expenseStripAmountClass(item: ExpenseStripItem): string {
  return item.statusLabel === "Paid" ? "text-muted" : "text-highlighted";
}

function formatExpenseStartPreview(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ExpenseFilterPill({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors duration-150",
        agencyFocusRingClass,
        selected ? "text-highlighted" : "text-muted hover:bg-elevated/70 hover:text-highlighted",
        "motion-reduce:transition-none",
      )}
      onClick={onSelect}
    >
      {selected ? (
        <motion.span
          layoutId="expense-strip-filter-bg"
          className="absolute inset-0 rounded-full bg-elevated ring-1 ring-border"
          transition={moneyBaseTransition}
          aria-hidden
        />
      ) : null}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function ExpenseStripRow({
  item,
  index,
  onOpenEdit,
  onOpenPayment,
}: {
  item: ExpenseStripItem;
  index: number;
  onOpenEdit: (expenseId: string) => void;
  onOpenPayment: (expenseId: string) => void;
}) {
  const paymentLabel = item.kind === "subscription" ? "Pay" : "Record";
  const amountColumnLabel = item.canRecordPayment
    ? "Remaining"
    : item.statusLabel === "Paid"
      ? "Paid"
      : null;

  return (
    <motion.li
      layout={false}
      custom={index}
      variants={moneyExpenseStripItemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={expenseStripRowClass}
      aria-label={`${item.name}. ${item.statusLabel}. ${item.amountLabel}.`}
    >
      <ExpenseStripGlyph kind={item.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto min-h-0 max-w-full truncate px-0 py-0 text-start text-xs font-medium text-highlighted sm:text-sm"
            onClick={() => onOpenEdit(item.expenseId)}
            title={item.name}
          >
            <span dir="auto">{item.name}</span>
          </Button>
          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[0.6875rem]">
            {item.statusLabel}
          </Badge>
        </div>
        <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
          {expenseStripMeta(item)}
        </p>
        {item.note ? (
          <p className="truncate text-[11px] text-muted/80" dir="auto">
            {item.note}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
        {amountColumnLabel ? (
          <div className="text-[0.625rem] font-medium tracking-[0.06em] text-muted uppercase">
            {amountColumnLabel}
          </div>
        ) : null}
        <span
          className={cn(
            agencyMetricClass,
            "whitespace-nowrap font-mono text-sm font-semibold tabular-nums sm:text-base",
            expenseStripAmountClass(item),
          )}
        >
          {item.amountLabel}
        </span>
        {item.canRecordPayment ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className={cn(
              "h-auto min-h-0 shrink-0 px-0 py-0 text-[11px] font-semibold text-muted",
              "opacity-80 transition-opacity duration-150 hover:text-highlighted group-hover/row:opacity-100 group-focus-within/row:opacity-100",
              "motion-reduce:transition-none",
            )}
            onClick={() => onOpenPayment(item.expenseId)}
            aria-label={`${paymentLabel} ${item.name}`}
          >
            {paymentLabel}
          </Button>
        ) : null}
      </div>
    </motion.li>
  );
}

function ExpensesSection({ expenses }: { expenses: AgencyMoneySurfaceViewModel["expenses"] }) {
  const create = expenses.create;
  const details = expenses.details;
  const payment = expenses.payment;
  const strip = expenses.strip;

  return (
    <section
      className={cn(agencyPanelClass, "flex h-full min-h-0 flex-col overflow-hidden")}
      aria-label="Expenses"
    >
      <div className="flex flex-col gap-3 border-b border-default p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className={cn(agencyWorkTitleClass, "text-balance")}>{expenses.title}</h2>
            <div className="text-xs text-muted text-balance">
              {expenses.periodSpendLabel ? (
                <>
                  <span className="text-[0.625rem] font-medium tracking-[0.06em] text-muted uppercase">
                    Period spend
                  </span>
                  <span
                    className={cn(
                      agencyMetricClass,
                      "mt-0.5 block font-mono text-base font-semibold tabular-nums tracking-tight text-highlighted",
                    )}
                  >
                    {expenses.periodSpendLabel}
                  </span>
                </>
              ) : (
                <p>{expenses.subtitle}</p>
              )}
            </div>
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

        {expenses.status === "ready" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <LayoutGroup id="expense-strip-filters">
              <div
                className="flex flex-wrap items-center gap-1"
                role="group"
                aria-label="Expense filters"
              >
                {strip.filterOptions.map((option) => (
                  <ExpenseFilterPill
                    key={option.id}
                    label={option.label}
                    selected={strip.filter === option.id}
                    onSelect={() => strip.onFilterChange(option.id)}
                  />
                ))}
              </div>
            </LayoutGroup>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {expenses.status === "loading" ? (
          <div className="flex flex-col divide-y divide-default" aria-busy="true" aria-label="Loading expenses">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 max-w-[55%] rounded-md" />
                  <Skeleton className="h-3 w-44 max-w-[70%] rounded-md" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Skeleton className="h-2.5 w-8 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              </div>
            ))}
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
        ) : strip.items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-default pb-2">
            <AnimatePresence initial={false} mode="popLayout">
              {strip.items.map((item, index) => (
                <ExpenseStripRow
                  key={`${strip.filter}-${item.id}`}
                  item={item}
                  index={index}
                  onOpenEdit={expenses.onOpenEdit}
                  onOpenPayment={expenses.onOpenPayment}
                />
              ))}
            </AnimatePresence>
          </ul>
        ) : strip.empty ? (
          <motion.div
            key={`${strip.filter}-empty`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={moneyBaseTransition}
            className="mx-5 my-6 rounded-2xl border border-dashed border-default px-4 py-8 text-center"
          >
            <p className="text-sm font-semibold text-highlighted text-balance">{strip.empty.title}</p>
            <p className="mt-1 text-xs text-muted text-balance">{strip.empty.body}</p>
          </motion.div>
        ) : null}
      </div>

      <Dialog open={details.open} onOpenChange={details.onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-1 border-b border-default px-5 py-4 pr-14 text-left">
            <DialogTitle className="text-base font-bold text-highlighted">
              {details.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              {details.totalCount === 0
                ? "Nothing logged yet"
                : `${details.totalCount} ${details.totalCount === 1 ? "expense" : "expenses"}`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-4">
            {details.totalCount === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="py-8 text-center">
                  <CardTitle className="text-sm font-semibold text-highlighted">
                    {details.emptyTitle}
                  </CardTitle>
                  <CardDescription className="mt-1 text-balance">{details.emptyBody}</CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-5">
                {details.sections.map((section) => (
                  <Card key={section.id} size="sm" className="shadow-none">
                    <CardHeader className="flex-row items-baseline justify-between gap-2 pb-0">
                      <CardTitle
                        className={cn(
                          agencyLabelClass,
                          "text-xs font-medium tracking-wide text-muted uppercase",
                        )}
                      >
                        {section.title}
                      </CardTitle>
                      <Badge variant="outline" className="rounded-md font-mono tabular-nums">
                        {section.items.length}
                      </Badge>
                    </CardHeader>
                    <CardContent className="px-0 pt-2">
                      {section.items.length === 0 ? (
                        <CardDescription className="px-(--card-spacing) text-xs">
                          None in this group.
                        </CardDescription>
                      ) : (
                        <ul className="flex flex-col divide-y divide-default border-t border-default">
                          {section.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 px-(--card-spacing) py-2.5 transition-colors duration-150 hover:bg-elevated/25 motion-reduce:transition-none"
                            >
                              <ExpenseStripGlyph kind={item.kind} />
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto min-h-0 max-w-full truncate px-0 py-0 text-xs font-medium text-highlighted sm:text-sm"
                                    onClick={() => expenses.onOpenEdit(item.expenseId)}
                                  >
                                    <span dir="auto">{item.name}</span>
                                  </Button>
                                  <Badge
                                    variant="secondary"
                                    className="h-5 rounded-md px-1.5 text-[0.6875rem]"
                                  >
                                    {item.statusLabel}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
                                  {item.meta}
                                </p>
                                {item.note ? (
                                  <p className="truncate text-[11px] text-muted/80" dir="auto">
                                    {item.note}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-highlighted">
                                  {item.amountLabel}
                                </span>
                                {item.canRecordPayment ? (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto min-h-0 px-0 py-0 text-[11px] font-semibold text-muted hover:text-highlighted"
                                    onClick={() => expenses.onOpenPayment(item.expenseId)}
                                    aria-label={`${item.kind === "subscription" ? "Pay" : "Record payment"} ${item.name}`}
                                  >
                                    {item.kind === "subscription" ? "Pay" : "Record"}
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Close
              </Button>
            </DialogClose>
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
          <DialogHeader className="space-y-2 border-b border-default px-5 py-4 pr-14 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-base font-bold text-highlighted">
                {create.title}
              </DialogTitle>
              <Badge variant="secondary">
                {create.kind === "subscription" ? "Subscription" : "One-time"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted">
              {create.kind === "subscription" && create.amountMode === "variable"
                ? "Recurring charge. Amount is set each time you Pay."
                : create.kind === "subscription"
                  ? "Recurring charge with a clear next due date"
                  : "Ops spend for this period"}
            </DialogDescription>
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
                  disabled={create.kindLocked}
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
                <>
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor={`${create.formId}-amount-mode`} className={agencyFormLabelClass}>
                      Amount type
                    </Label>
                    <Select
                      value={create.amountMode}
                      onValueChange={(value) =>
                        create.onAmountModeChange(value as typeof create.amountMode)
                      }
                    >
                      <SelectTrigger
                        id={`${create.formId}-amount-mode`}
                        className="h-9 w-full rounded-xl border-default bg-default"
                      >
                        <SelectValue placeholder="Select amount type" />
                      </SelectTrigger>
                      <SelectContent>
                        {create.amountModeOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {create.amountMode === "variable" ? (
                      <CardDescription className="text-[11px] text-pretty">
                        Enter this cycle&apos;s amount when you Pay.
                      </CardDescription>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={agencyFormFieldClass}>
                      <Label htmlFor={`${create.formId}-period`} className={agencyFormLabelClass}>
                        Period
                      </Label>
                      <Select
                        value={create.period ?? undefined}
                        onValueChange={(value) =>
                          create.onPeriodChange(value as MoneyExpensePeriod)
                        }
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

                    <div className={agencyFormFieldClass}>
                      <Label
                        htmlFor={`${create.formId}-starts-at`}
                        className={agencyFormLabelClass}
                      >
                        Start date <span className="font-normal text-muted">(optional)</span>
                      </Label>
                      <MemberProfileDatePicker
                        id={`${create.formId}-starts-at`}
                        value={create.startsAt}
                        onChange={create.onStartsAtChange}
                        aria-label="Subscription start date"
                        className="h-9 rounded-xl"
                      />
                    </div>
                  </div>
                  {create.startsAt ? (
                    <Card size="sm" className="bg-muted/25 shadow-none">
                      <CardContent className="py-2.5 text-[11px] text-muted text-pretty">
                        First due{" "}
                        <span className="font-medium text-highlighted">
                          {formatExpenseStartPreview(create.startsAt)}
                        </span>
                        {create.period ? (
                          <> · then {moneyExpensePeriodLabel(create.period)?.toLowerCase()}</>
                        ) : null}
                        . After Pay, it stays hidden until the next due.
                      </CardContent>
                    </Card>
                  ) : (
                    <CardDescription className="text-[11px] text-pretty">
                      Add a start date to pin the first due date. Without one, the next due is one
                      period from now.
                    </CardDescription>
                  )}
                </>
              ) : null}

              {create.kind !== "subscription" || create.amountMode === "fixed" ? (
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
              ) : null}

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
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={!create.canSubmit} form={create.formId}>
                {create.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-2 border-b border-default px-5 py-4 pr-14 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-base font-bold text-highlighted">
                {payment.kind === "subscription" ? "Pay subscription" : "Record payment"}
              </DialogTitle>
              {payment.kind === "subscription" ? (
                <Badge variant="secondary">Advances next due</Badge>
              ) : null}
            </div>
            <DialogDescription className="text-xs text-muted">{payment.name}</DialogDescription>
          </DialogHeader>
          <form
            id={payment.formId}
            onSubmit={(event: FormEvent<HTMLFormElement>) => payment.onSubmit(event)}
          >
            <div className="flex flex-col gap-4 px-5 py-4">
              <Card size="sm" className="bg-muted/25 shadow-none">
                <CardContent className="py-4 text-center">
                  <CardDescription>{payment.heroLabel}</CardDescription>
                  <CardTitle
                    className={cn(
                      agencyMetricClass,
                      "mt-1 font-mono text-2xl font-semibold tabular-nums text-highlighted",
                    )}
                  >
                    {payment.heroValue || "—"}
                  </CardTitle>
                  {payment.heroHint ? (
                    <CardDescription className="mt-2 text-[11px] text-pretty">
                      {payment.heroHint}
                    </CardDescription>
                  ) : null}
                </CardContent>
              </Card>
              <Separator />
              <div className={agencyFormFieldClass}>
                <Label htmlFor="money-expense-payment-amount" className={agencyFormLabelClass}>
                  Amount ({payment.currency})
                </Label>
                <Input
                  id="money-expense-payment-amount"
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(event) => payment.onAmountChange(event.target.value)}
                  autoFocus
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm tabular-nums",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>
            <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={!payment.canSubmit} form={payment.formId}>
                {payment.kind === "subscription" ? "Pay" : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export { ExpensesSection };
