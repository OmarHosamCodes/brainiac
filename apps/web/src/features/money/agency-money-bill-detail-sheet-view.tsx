import {
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import { type MoneyBillAdjustmentRow } from "@/features/billing/money-bills-rows";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
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
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type BillsViewModel = AgencyMoneySurfaceViewModel["bills"];

type AgencyMoneyBillDetailSheetProps = {
  bills: BillsViewModel;
  onOpenParty: (group: MoneyBillPersonGroup) => void;
};

function StatusBadge({ label }: { label: string }) {
  const variant = label === "Paid" ? "success" : label === "Outstanding" ? "warning" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

function groupStatusLabel(group: MoneyBillPersonGroup): string {
  const firstStatus = group.lines[0]?.statusLabel ?? "Ready";
  return group.lines.every((line) => line.statusLabel === firstStatus) ? firstStatus : "Mixed";
}

function DetailHeader({
  title,
  status,
  remainingLabel,
  hasRemaining,
  onOpenParty,
  description,
}: {
  title: string;
  status: string;
  remainingLabel: string;
  hasRemaining: boolean;
  onOpenParty?: () => void;
  description: string;
}) {
  return (
    <SheetHeader className="border-b border-default pr-14">
      <div className="flex flex-wrap items-center gap-2">
        {onOpenParty ? (
          <SheetTitle asChild>
            <button
              type="button"
              className="rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={onOpenParty}
            >
              {title}
            </button>
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

function ObligationLine({ line }: { line: MoneyBillObligationLine }) {
  const subtitle = line.isCarry ? line.subtitle.replace(/^Prior period · /, "") : line.subtitle;
  return (
    <li className="flex flex-col gap-3 border-b border-default px-6 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {line.isCarry ? <Badge variant="outline">Prior</Badge> : null}
            <span className="text-sm font-medium text-highlighted">{subtitle}</span>
          </div>
        </div>
        <StatusBadge label={line.statusLabel} />
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

function GroupDetail({
  group,
  bills,
  onOpenParty,
}: {
  group: MoneyBillPersonGroup;
  bills: BillsViewModel;
  onOpenParty: (group: MoneyBillPersonGroup) => void;
}) {
  const lines = [
    ...group.lines.filter((line) => !line.isCarry),
    ...group.lines.filter((line) => line.isCarry),
  ];
  const disabled = bills.isMutationPending;

  return (
    <>
      <DetailHeader
        title={group.title}
        status={groupStatusLabel(group)}
        remainingLabel={group.remainingLabel}
        hasRemaining={group.remainingAmount > 0}
        onOpenParty={() => onOpenParty(group)}
        description={`${group.lines.length} ${group.lines.length === 1 ? "bill line" : "bill lines"}`}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label={`${group.title} bill lines`}>
          {lines.map((line) => (
            <ObligationLine key={line.id} line={line} />
          ))}
        </ul>
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
          {group.party === "client" ? "Collect" : "Pay"}
        </Button>
      </SheetFooter>
    </>
  );
}

function AdjustmentDetail({ row, bills }: { row: MoneyBillAdjustmentRow; bills: BillsViewModel }) {
  const disabled = bills.isMutationPending;
  const markPaidIsPrimary = !row.canRecordPayment && row.canMarkPaid;

  return (
    <>
      <DetailHeader
        title={row.title}
        status={row.statusLabel}
        remainingLabel={row.remainingLabel}
        hasRemaining={row.remainingAmount > 0}
        description={`${row.sectionTitle} adjustment`}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
          <LedgerAmount label="Type" value={row.sectionTitle} />
          <LedgerAmount label="Period" value={row.periodLabel} />
          <LedgerAmount label="Amount" value={row.amountLabel} />
          <LedgerAmount label="Paid" value={row.paidLabel} />
          <LedgerAmount
            label="Remaining"
            value={row.remainingLabel}
            warning={row.remainingAmount > 0}
          />
        </dl>
      </div>
      <SheetFooter className="border-t border-default bg-popover">
        {row.canDismiss ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => bills.onDismissAdjustment(row.id)}
          >
            Dismiss
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
            Record payment
          </Button>
        ) : null}
        {markPaidIsPrimary ? (
          <Button type="button" disabled={disabled} onClick={() => bills.onMarkPaid(row.id)}>
            Mark paid
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
        status={pool.remainingAmount > 0 ? "Outstanding" : "Paid"}
        remainingLabel={pool.remainingLabel}
        hasRemaining={pool.remainingAmount > 0}
        description="Shared salary pool for the selected period"
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
            Pay
          </Button>
        </SheetFooter>
      ) : null}
    </>
  );
}

export function AgencyMoneyBillDetailSheet({
  bills,
  onOpenParty,
}: AgencyMoneyBillDetailSheetProps) {
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
      <SheetContent side="right" className="data-[side=right]:sm:max-w-lg">
        {group ? <GroupDetail group={group} bills={bills} onOpenParty={onOpenParty} /> : null}
        {adjustment ? <AdjustmentDetail row={adjustment} bills={bills} /> : null}
        {selection?.kind === "salary-pool" ? <SalaryPoolDetail bills={bills} /> : null}
      </SheetContent>
    </Sheet>
  );
}
