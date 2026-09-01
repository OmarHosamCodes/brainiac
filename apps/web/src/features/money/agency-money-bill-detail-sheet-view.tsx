import { MoreHorizontal } from "lucide-react";

import {
  type MoneyBillObligationLine,
  type MoneyBillPendingAdjustmentItem,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillClientHref,
  moneyBillMemberHref,
  moneyBillsAdjustCtaLabel,
  moneyBillsPickAdjustLine,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import {
  moneyBillGroupCarryCount,
  moneyBillGroupStatusLabel,
  moneyBillStatusBadgeVariant,
  moneyBillsSheetCaption,
} from "@/features/billing/money-bills-table-columns";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/ui/sheet";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type BillsViewModel = AgencyMoneySurfaceViewModel["bills"];

function StatusBadge({ label }: { label: string }) {
  return <Badge variant={moneyBillStatusBadgeVariant(label)}>{label}</Badge>;
}

function DetailHeader({
  title,
  status,
  remainingLabel,
  hasRemaining,
  partyHref,
  description,
}: {
  title: string;
  status: string;
  remainingLabel: string;
  hasRemaining: boolean;
  partyHref?: string | null;
  description: string;
}) {
  return (
    <SheetHeader className="border-b border-default pr-14">
      <div className="flex flex-wrap items-center gap-2">
        {partyHref ? (
          <SheetTitle asChild>
            <Link
              to={partyHref}
              className="rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={(event) => event.stopPropagation()}
            >
              {title}
            </Link>
          </SheetTitle>
        ) : (
          <SheetTitle>{title}</SheetTitle>
        )}
        <StatusBadge label={status} />
      </div>
      <SheetDescription>{description}</SheetDescription>
      <div className="flex items-baseline justify-between gap-3 pt-3">
        <span className="text-xs text-muted">Remaining</span>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            hasRemaining ? "text-warning" : "text-highlighted",
          )}
        >
          {remainingLabel}
        </span>
      </div>
    </SheetHeader>
  );
}

function LedgerAmount({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.6875rem] text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono text-xs tabular-nums",
          warning ? "text-warning" : "text-highlighted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ObligationLine({
  line,
  group,
  bills,
  disabled,
}: {
  line: MoneyBillObligationLine;
  group: MoneyBillPersonGroup;
  bills: BillsViewModel;
  disabled: boolean;
}) {
  const subtitle = line.isCarry ? line.subtitle.replace(/^Prior period · /, "") : line.subtitle;
  const canSend = line.obligationKind === "invoice" && line.statusLabel === "Outstanding";
  return (
    <li className="flex flex-col gap-3 border-b border-default px-6 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {line.isCarry ? <Badge variant="outline">Prior</Badge> : null}
            <span className="text-sm font-medium text-highlighted">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge label={line.statusLabel} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={disabled}
                aria-label={`Actions for ${subtitle}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => bills.onOpenPreviewLine(group, line)}>
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => bills.onOpenAdjustLine(group, line)}>
                {group.party === "client" ? "Collect" : "Pay"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => bills.onOpenAdjustLine(group, line, { tab: "adjustments" })}
              >
                Adjust
              </DropdownMenuItem>
              {canSend ? (
                <DropdownMenuItem onSelect={() => bills.onSend(line.id)}>
                  Send invoice
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <LedgerAmount label="Total" value={line.totalLabel} />
        <LedgerAmount
          label={line.party === "client" ? "Received" : "Paid"}
          value={line.receivedLabel}
        />
        <LedgerAmount
          label="Remaining"
          value={line.remainingLabel}
          warning={line.remainingAmount > 0}
        />
      </dl>
    </li>
  );
}

function AdjustmentsPanel({
  group,
  bills,
  disabled,
}: {
  group: MoneyBillPersonGroup;
  bills: BillsViewModel;
  disabled: boolean;
}) {
  const items = group.pendingAdjustments;
  const baseCents = group.totalCents - group.pendingAdjustmentCents;
  return (
    <div className="border-t border-default px-6 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-highlighted">Adjustments</h3>
        {group.party === "client" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || group.lines.length === 0}
            onClick={() => bills.onAddAdjustment(group)}
          >
            Add
          </Button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">No period adjustments on this bill.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item: MoneyBillPendingAdjustmentItem) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-highlighted">{item.kindLabel}</span>
                  {item.applied ? <Badge variant="outline">On invoice</Badge> : null}
                </div>
                {item.note ? <p className="text-xs text-muted">{item.note}</p> : null}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-sm tabular-nums text-highlighted">
                  {item.amountLabel}
                </span>
                {group.party === "client" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={disabled}
                        aria-label={`Actions for ${item.kindLabel}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => bills.onEditPendingAdjustment(group, item)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => bills.onDeletePendingAdjustment(item.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {group.pendingAdjustmentCents !== 0 ? (
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-default pt-3">
          <LedgerAmount label="Base" value={formatMoneyAmount(baseCents, group.currency)} />
          <LedgerAmount
            label="Adjustments"
            value={formatMoneyAmount(group.pendingAdjustmentCents, group.currency)}
          />
          <LedgerAmount label="Total" value={group.totalLabel} />
        </dl>
      ) : null}
    </div>
  );
}

function GroupDetail({ group, bills }: { group: MoneyBillPersonGroup; bills: BillsViewModel }) {
  const lines = [
    ...group.lines.filter((line) => !line.isCarry),
    ...group.lines.filter((line) => line.isCarry),
  ];
  const disabled = bills.isMutationPending;
  const adjustLine = moneyBillsPickAdjustLine(group.lines);
  const adjustLabel = adjustLine ? moneyBillsAdjustCtaLabel(group.party, adjustLine) : "Adjust";
  const partyHref =
    group.party === "client" && group.clientId
      ? moneyBillClientHref(group.clientId)
      : group.party === "team" && group.userId
        ? moneyBillMemberHref(group.userId)
        : null;

  return (
    <>
      <DetailHeader
        title={group.title}
        status={moneyBillGroupStatusLabel(group)}
        remainingLabel={group.remainingLabel}
        hasRemaining={group.remainingAmount > 0}
        partyHref={partyHref}
        description={moneyBillsSheetCaption({
          kind: "group",
          remainingAmount: group.remainingAmount,
          carryCount: moneyBillGroupCarryCount(group),
          party: group.party,
        })}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label={`${group.title} bill lines`}>
          {lines.map((line) => (
            <ObligationLine
              key={line.id}
              line={line}
              group={group}
              bills={bills}
              disabled={disabled}
            />
          ))}
        </ul>
        <AdjustmentsPanel group={group} bills={bills} disabled={disabled} />
      </div>
      <SheetFooter className="border-t border-default bg-popover">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => bills.onOpenPreview(group)}
        >
          {group.party === "client" ? "Preview invoice" : "Preview payslip"}
        </Button>
        <Button type="button" disabled={disabled} onClick={() => bills.onOpenAdjust(group)}>
          {disabled ? "Saving…" : adjustLabel}
        </Button>
        {group.party === "client" ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || group.lines.length === 0}
            onClick={() => bills.onAddAdjustment(group)}
          >
            Add adjustment
          </Button>
        ) : null}
      </SheetFooter>
    </>
  );
}

function AdjustmentDetail({ row, bills }: { row: MoneyBillAdjustmentRow; bills: BillsViewModel }) {
  const disabled = bills.isMutationPending;
  const markPaidIsPrimary = !row.canRecordPayment && row.canMarkPaid;
  const dismissIsPrimary = row.canDismiss && !row.canRecordPayment && !row.canMarkPaid;

  return (
    <>
      <DetailHeader
        title={row.title}
        status={row.statusLabel}
        remainingLabel={row.remainingLabel}
        hasRemaining={row.remainingAmount > 0}
        description={moneyBillsSheetCaption({
          kind: "adjustment",
          remainingAmount: row.remainingAmount,
          sectionTitle: row.sectionTitle,
        })}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
          <LedgerAmount label="Type" value={row.sectionTitle} />
          <LedgerAmount label="Period" value={row.periodLabel} />
          <LedgerAmount label="Amount" value={row.amountLabel} />
          <LedgerAmount label="Paid" value={row.paidLabel} />
        </dl>
      </div>
      <SheetFooter className="border-t border-default bg-popover">
        {row.canDismiss ? (
          <Button
            type="button"
            variant={dismissIsPrimary ? "default" : "ghost"}
            disabled={disabled}
            onClick={() => bills.onDismissAdjustment(row.id)}
          >
            {dismissIsPrimary && disabled ? "Saving…" : "Dismiss"}
          </Button>
        ) : null}
        {row.canMarkPaid && !markPaidIsPrimary ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => bills.onMarkPaid(row.id)}
          >
            Mark paid
          </Button>
        ) : null}
        {row.canRecordPayment ? (
          <Button type="button" disabled={disabled} onClick={() => bills.onOpenPayment(row.id)}>
            {disabled ? "Saving…" : "Record payment"}
          </Button>
        ) : null}
        {markPaidIsPrimary ? (
          <Button type="button" disabled={disabled} onClick={() => bills.onMarkPaid(row.id)}>
            {disabled ? "Saving…" : "Mark paid"}
          </Button>
        ) : null}
      </SheetFooter>
    </>
  );
}

function SalaryPoolDetail({ bills }: { bills: BillsViewModel }) {
  const salaryPool = bills.salaryPool;
  const pool = salaryPool.pool;
  if (!pool) return null;
  const disabled = bills.isMutationPending || salaryPool.isPending;

  return (
    <>
      <DetailHeader
        title="Team salaries"
        status={pool.statusLabel}
        remainingLabel={pool.remainingLabel}
        hasRemaining={pool.remainingAmount > 0}
        description={moneyBillsSheetCaption({
          kind: "salary-pool",
          remainingAmount: pool.remainingAmount,
        })}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <dl className="grid grid-cols-3 gap-4">
          <LedgerAmount label="Total" value={pool.totalLabel} />
          <LedgerAmount label="Paid" value={pool.paidLabel} />
          <LedgerAmount
            label="Remaining"
            value={pool.remainingLabel}
            warning={pool.remainingAmount > 0}
          />
        </dl>
      </div>
      {salaryPool.canPay ? (
        <SheetFooter className="border-t border-default bg-popover">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="money-salary-pool-payment">Payment amount ({pool.currency})</Label>
            <Input
              id="money-salary-pool-payment"
              inputMode="decimal"
              value={salaryPool.payAmount}
              disabled={disabled}
              onChange={(event) => salaryPool.onPayAmountChange(event.target.value)}
              aria-invalid={Boolean(salaryPool.validationMessage)}
              aria-describedby={
                salaryPool.validationMessage ? "money-salary-pool-payment-error" : undefined
              }
            />
            {salaryPool.validationMessage ? (
              <p
                id="money-salary-pool-payment-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {salaryPool.validationMessage}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={disabled || !salaryPool.canSubmitPay}
            onClick={salaryPool.onPay}
          >
            {disabled ? "Saving…" : "Pay"}
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

export function AgencyMoneyBillDetailSheet({ bills }: { bills: BillsViewModel }) {
  const selection = bills.detailSelection;
  const group =
    selection?.kind === "group" && bills.detailRow?.kind === "person-group"
      ? bills.detailRow
      : null;
  const adjustment =
    selection?.kind === "adjustment" && bills.detailRow?.kind === "adjustment"
      ? bills.detailRow
      : null;

  return (
    <Sheet
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) bills.onCloseDetail();
      }}
    >
      <SheetContent
        side={bills.sheetSide}
        className="data-[side=bottom]:max-h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-lg"
      >
        {group ? <GroupDetail group={group} bills={bills} /> : null}
        {adjustment ? <AdjustmentDetail row={adjustment} bills={bills} /> : null}
        {selection?.kind === "salary-pool" ? <SalaryPoolDetail bills={bills} /> : null}
      </SheetContent>
    </Sheet>
  );
}
