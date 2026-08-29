import { type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  moneyExpensePeriodLabel,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
} from "@/features/billing/money-expense-form";
import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyErrorPanelClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
} from "@/features/shared/agency-ui";
import {
  expenseStripAmountLabel,
  expenseStripMeta,
  type ExpenseStripItem,
} from "@/features/money/money-expenses-strip";
import { ExpenseStripGlyph } from "@/features/money/money-expense-strip-glyphs";
import { moneyBaseTransition, moneyExpenseStripItemVariants } from "@/features/money/money-motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/ui/card";
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
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

const expenseStripRowClass =
  "group/row flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-elevated/25 focus-within:bg-elevated/25 motion-reduce:transition-none";

function expenseStripAmountClass(item: ExpenseStripItem): string {
  return item.status === "paid" ? "text-muted" : "text-highlighted";
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

function ExpenseStripRow({
  item,
  index,
  searchTerm,
  onOpenEdit,
  onOpenPayment,
}: {
  item: ExpenseStripItem;
  index: number;
  searchTerm: string;
  onOpenEdit: (expenseId: string) => void;
  onOpenPayment: (expenseId: string) => void;
}) {
  const paymentLabel = item.kind === "subscription" ? "Pay" : "Record";
  const amountColumnLabel = item.canRecordPayment
    ? "Remaining"
    : item.status === "paid"
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
            className="-my-2 min-h-10 max-w-full truncate px-0 py-2 text-start text-xs font-medium text-highlighted sm:my-0 sm:min-h-0 sm:py-0 sm:text-sm"
            onClick={() => onOpenEdit(item.expenseId)}
            title={item.name}
          >
            <span dir="auto">
              <AgencySearchHighlight text={item.name} query={searchTerm} />
            </span>
          </Button>
          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[0.6875rem]">
            {item.statusLabel}
          </Badge>
        </div>
        <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
          <AgencySearchHighlight text={expenseStripMeta(item)} query={searchTerm} />
        </p>
        {item.note ? (
          <p className="truncate text-[11px] text-muted/80" dir="auto">
            <AgencySearchHighlight text={item.note} query={searchTerm} />
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
          {expenseStripAmountLabel(item)}
        </span>
        {item.canRecordPayment ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className={cn(
              "min-h-10 shrink-0 px-0 py-2 text-[11px] font-semibold text-muted sm:min-h-0 sm:py-0",
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

function MoneyExpensesPanelContent({
  panel,
  searchTerm,
}: {
  panel: AgencyMoneySurfaceViewModel["bills"]["expensesPanel"];
  searchTerm: string;
}) {
  const create = panel.create;
  const details = panel.details;
  const payment = panel.payment;
  const strip = panel.strip;

  return (
    <>
      <div className="flex flex-col">
        {panel.status === "loading" ? (
          <div
            className="flex flex-col divide-y divide-default"
            aria-busy="true"
            aria-label="Loading expenses"
          >
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
        ) : panel.status === "error" ? (
          <div className={cn(agencyErrorPanelClass, "m-5")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load expenses</p>
            <p className="mt-1 text-xs text-muted">{panel.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={panel.onRetry}
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
                  searchTerm={searchTerm}
                  onOpenEdit={panel.onOpenEdit}
                  onOpenPayment={panel.onOpenPayment}
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
            <p className="text-sm font-semibold text-highlighted text-balance">
              <AgencySearchHighlight text={strip.empty.title} query={searchTerm} />
            </p>
            <p className="mt-1 text-xs text-muted text-balance">
              <AgencySearchHighlight text={strip.empty.body} query={searchTerm} />
            </p>
            {!searchTerm.trim() && strip.filter === "all" ? (
              <Button type="button" size="sm" className="mt-3" onClick={panel.onOpenCreate}>
                Add expense
              </Button>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      <Dialog open={details.open} onOpenChange={details.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {details.totalCount === 0 ? (
              <div className="border-y border-dashed border-default py-8 text-center">
                <h3 className="text-sm font-semibold text-highlighted">
                  <AgencySearchHighlight text={details.emptyTitle} query={searchTerm} />
                </h3>
                <p className="mt-1 text-sm text-muted text-balance">
                  <AgencySearchHighlight text={details.emptyBody} query={searchTerm} />
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {details.sections.map((section) => (
                  <section
                    key={section.id}
                    className="border-t border-default py-4 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3
                        className={cn(
                          agencyLabelClass,
                          "text-xs font-medium tracking-wide text-muted uppercase",
                        )}
                      >
                        {section.title}
                      </h3>
                      <span className="font-mono text-xs text-muted tabular-nums">
                        {section.items.length}
                      </span>
                    </div>
                    <div className="pt-2">
                      {section.items.length === 0 ? (
                        <p className="text-xs text-muted">None in this group.</p>
                      ) : (
                        <ul className="flex flex-col divide-y divide-default border-y border-default">
                          {section.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 py-2.5 transition-colors duration-150 hover:bg-elevated/25 motion-reduce:transition-none"
                            >
                              <ExpenseStripGlyph kind={item.kind} />
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="-my-2 min-h-10 max-w-full truncate px-0 py-2 text-xs font-medium text-highlighted sm:my-0 sm:min-h-0 sm:py-0 sm:text-sm"
                                    onClick={() => panel.onOpenEdit(item.expenseId)}
                                  >
                                    <span dir="auto">
                                      <AgencySearchHighlight text={item.name} query={searchTerm} />
                                    </span>
                                  </Button>
                                  <Badge
                                    variant="secondary"
                                    className="h-5 rounded-md px-1.5 text-[0.6875rem]"
                                  >
                                    {item.statusLabel}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 truncate font-mono text-[0.6875rem] leading-snug text-muted tabular-nums sm:text-xs">
                                  <AgencySearchHighlight
                                    text={expenseStripMeta(item)}
                                    query={searchTerm}
                                  />
                                </p>
                                {item.note ? (
                                  <p className="truncate text-[11px] text-muted/80" dir="auto">
                                    <AgencySearchHighlight text={item.note} query={searchTerm} />
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-highlighted">
                                  {expenseStripAmountLabel(item)}
                                </span>
                                {item.canRecordPayment ? (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="min-h-10 px-0 py-2 text-[11px] font-semibold text-muted hover:text-highlighted sm:min-h-0 sm:py-0"
                                    onClick={() => panel.onOpenPayment(item.expenseId)}
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
                    </div>
                  </section>
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
                panel.onOpenCreate();
              }}
            >
              Add expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={create.open} onOpenChange={create.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
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
                ? "Recurring charge. First amount is optional; later cycles you enter when you Pay."
                : create.kind === "subscription"
                  ? "Recurring charge with a clear next due date"
                  : "Ops spend for this period"}
            </DialogDescription>
          </DialogHeader>

          <form
            id={create.formId}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(event: FormEvent<HTMLFormElement>) => create.onSubmit(event)}
          >
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
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
                  required
                  aria-invalid={Boolean(create.errors.name)}
                  aria-describedby={create.errors.name ? `${create.formId}-name-error` : undefined}
                />
                {create.errors.name ? (
                  <p
                    id={`${create.formId}-name-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {create.errors.name}
                  </p>
                ) : null}
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
                {create.kindLocked ? (
                  <CardDescription className="text-[11px] text-pretty">
                    Type can&apos;t change after a payment has been recorded.
                  </CardDescription>
                ) : null}
              </div>

              {create.kind === "one_time" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={agencyFormFieldClass}>
                    <Label
                      htmlFor={`${create.formId}-occurred-at`}
                      className={agencyFormLabelClass}
                    >
                      Date <span className="font-normal text-muted">(optional)</span>
                    </Label>
                    <MemberProfileDatePicker
                      id={`${create.formId}-occurred-at`}
                      value={create.occurredAt}
                      onChange={create.onOccurredAtChange}
                      aria-label="One-time expense date"
                      className="h-9 rounded-xl"
                    />
                  </div>
                  {create.occurredAt ? (
                    <div className={agencyFormFieldClass}>
                      <Label
                        htmlFor={`${create.formId}-occurred-time`}
                        className={agencyFormLabelClass}
                      >
                        Time <span className="font-normal text-muted">(optional)</span>
                      </Label>
                      <Input
                        id={`${create.formId}-occurred-time`}
                        type="time"
                        value={create.occurredTime}
                        onChange={(event) => create.onOccurredTimeChange(event.target.value)}
                        className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                      />
                    </div>
                  ) : null}
                  <CardDescription className="text-[11px] text-pretty sm:col-span-2">
                    Leave blank to record as now. A date places this spend in that day.
                  </CardDescription>
                </div>
              ) : null}

              {create.kind === "subscription" ? (
                <>
                  <div className={agencyFormFieldClass}>
                    <Label
                      htmlFor={`${create.formId}-amount-mode`}
                      className={agencyFormLabelClass}
                    >
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
                      {create.errors.period ? (
                        <p className="text-xs text-destructive" role="alert">
                          {create.errors.period}
                        </p>
                      ) : null}
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

              <div className={agencyFormFieldClass}>
                <Label htmlFor={`${create.formId}-amount`} className={agencyFormLabelClass}>
                  {create.kind === "subscription" && create.amountMode === "variable" ? (
                    <>
                      First amount <span className="font-normal text-muted">(optional)</span>
                    </>
                  ) : (
                    "Amount"
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`${create.formId}-amount`}
                    inputMode="decimal"
                    value={create.amount}
                    onChange={(event) => create.onAmountChange(event.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "h-9 min-w-0 flex-1 rounded-xl border-default bg-default text-sm tabular-nums",
                      agencyInputPlaceholderClass,
                    )}
                    required={create.kind !== "subscription" || create.amountMode === "fixed"}
                    aria-invalid={Boolean(create.errors.amount)}
                    aria-describedby={
                      create.errors.amount
                        ? `${create.formId}-amount-error`
                        : create.amountPreview
                          ? `${create.formId}-amount-preview`
                          : undefined
                    }
                  />
                  <Select value={create.currency} onValueChange={create.onCurrencyChange}>
                    <SelectTrigger
                      aria-label="Expense currency"
                      className="h-9 w-[5.5rem] shrink-0 rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {create.currencyOptions.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {create.amountPreview ? (
                  <p id={`${create.formId}-amount-preview`} className="text-[11px] text-muted">
                    {create.amountPreview}
                  </p>
                ) : null}
                {create.kind === "subscription" && create.amountMode === "variable" ? (
                  <CardDescription className="text-[11px] text-pretty">
                    Leave blank to enter the amount when you Pay. If you set one, it fills the first
                    Pay.
                  </CardDescription>
                ) : null}
                {create.errors.amount ? (
                  <p
                    id={`${create.formId}-amount-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {create.errors.amount}
                  </p>
                ) : null}
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
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={create.isPending} form={create.formId}>
                {create.isPending
                  ? create.mode === "edit"
                    ? "Saving…"
                    : "Adding…"
                  : create.submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
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
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(event: FormEvent<HTMLFormElement>) => payment.onSubmit(event)}
          >
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
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
                  required
                  aria-invalid={Boolean(payment.validationMessage)}
                  aria-describedby={
                    payment.validationMessage ? "money-expense-payment-amount-error" : undefined
                  }
                />
                {payment.validationMessage ? (
                  <p
                    id="money-expense-payment-amount-error"
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {payment.validationMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={payment.isPending} form={payment.formId}>
                {payment.isPending
                  ? "Recording…"
                  : payment.kind === "subscription"
                    ? "Pay"
                    : "Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { MoneyExpensesPanelContent };
