import { type FormEvent, type ReactNode } from "react";
import { CalendarClock, History, List, Plus } from "lucide-react";

import {
  moneyExpensePeriodLabel,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
} from "@/features/billing/money-expense-form";
import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
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
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Separator } from "@/ui/separator";
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type ExpensesGroupViewModel =
  | AgencyMoneySurfaceViewModel["expenses"]["upcoming"]
  | AgencyMoneySurfaceViewModel["expenses"]["recent"];

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
              onOpenDetails={expenses.onOpenDetails}
              onOpenEdit={expenses.onOpenEdit}
              onOpenPayment={expenses.onOpenPayment}
            />
            <div className="mx-5 border-t border-default" />
            <ExpensesGroup
              group={expenses.recent}
              icon={<History className="size-4 text-muted" aria-hidden />}
              grow
              onOpenDetails={expenses.onOpenDetails}
              onOpenEdit={expenses.onOpenEdit}
              onOpenPayment={expenses.onOpenPayment}
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
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto min-h-0 max-w-full truncate px-0 py-0 text-sm font-medium text-highlighted"
                                  onClick={() => expenses.onOpenEdit(item.expenseId)}
                                >
                                  {item.name}
                                </Button>
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
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="h-auto min-h-0 px-0 py-0 text-[11px]"
                                      onClick={() => expenses.onOpenPayment(item.expenseId)}
                                    >
                                      {item.kind === "subscription" ? "Pay" : "Record payment"}
                                    </Button>
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
                      <p className="text-[11px] text-muted text-pretty">
                        Enter this cycle&apos;s amount when you Pay.
                      </p>
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
                    <div className="rounded-xl border border-default bg-muted/25 px-3 py-2.5 text-[11px] text-muted text-pretty">
                      First due{" "}
                      <span className="font-medium text-highlighted">
                        {formatExpenseStartPreview(create.startsAt)}
                      </span>
                      {create.period ? (
                        <> · then {moneyExpensePeriodLabel(create.period)?.toLowerCase()}</>
                      ) : null}
                      . After Pay, it stays hidden until the next due.
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted text-pretty">
                      Add a start date to pin the first due date. Without one, the next due is one
                      period from now.
                    </p>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => create.onOpenChange(false)}
              >
                Cancel
              </Button>
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
              <div className="rounded-xl border border-default bg-muted/25 px-4 py-4 text-center">
                <p className="text-xs text-muted">{payment.heroLabel}</p>
                <p
                  className={cn(
                    agencyMetricClass,
                    "mt-1 font-mono text-2xl font-semibold tabular-nums text-highlighted",
                  )}
                >
                  {payment.heroValue || "—"}
                </p>
                {payment.heroHint ? (
                  <p className="mt-2 text-[11px] text-muted text-pretty">{payment.heroHint}</p>
                ) : null}
              </div>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => payment.onOpenChange(false)}
              >
                Cancel
              </Button>
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

function ExpensesGroup({
  group,
  icon,
  grow,
  onOpenDetails,
  onOpenEdit,
  onOpenPayment,
}: {
  group: ExpensesGroupViewModel;
  icon: ReactNode;
  grow?: boolean;
  onOpenDetails: () => void;
  onOpenEdit: (expenseId: string) => void;
  onOpenPayment: (expenseId: string) => void;
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
          {"visibility" in group ? (
            <DropdownMenu>
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 rounded-lg text-muted transition-colors duration-150 hover:text-highlighted motion-reduce:transition-none"
                        aria-label="Subscription visibility"
                      >
                        <List className="size-3.5" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Subscription visibility</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={group.visibility.due}
                  onCheckedChange={(checked) => group.visibility.onDueChange(checked === true)}
                >
                  Due
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={group.visibility.paid}
                  onCheckedChange={(checked) => group.visibility.onPaidChange(checked === true)}
                >
                  Paid
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onOpenDetails}>View all expenses</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 rounded-lg text-muted transition-colors duration-150 hover:text-highlighted motion-reduce:transition-none"
                    onClick={onOpenDetails}
                    aria-label={`View all expenses from ${group.title}`}
                  >
                    <List className="size-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">All expenses</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {hasItems ? (
        <ul className="flex flex-col gap-2">
          {group.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-default bg-elevated/30 px-3 py-2.5 transition-colors duration-150 hover:bg-elevated/50 motion-reduce:transition-none"
            >
              <span className="mt-0.5 size-7 shrink-0 rounded-full bg-muted/40" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 max-w-full truncate px-0 py-0 text-sm font-medium text-highlighted"
                    onClick={() => onOpenEdit(item.expenseId)}
                  >
                    {item.name}
                  </Button>
                  <span className="shrink-0 text-[11px] tabular-nums text-highlighted">
                    {item.amountLabel}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                  <span className="truncate">{item.meta}</span>
                  {item.canRecordPayment ? (
                    <>
                      <span aria-hidden>·</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto min-h-0 shrink-0 px-0 py-0 text-[11px]"
                        onClick={() => onOpenPayment(item.expenseId)}
                      >
                        {item.kind === "subscription" ? "Pay" : "Record payment"}
                      </Button>
                    </>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="mt-0.5 truncate text-xs text-muted">{item.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-default px-3.5 py-4">
          <p className="text-sm font-semibold text-highlighted">{group.emptyTitle}</p>
          <p className="mt-0.5 text-xs text-muted text-balance">{group.emptyBody}</p>
        </div>
      )}
    </div>
  );
}

export { ExpensesSection };
