import {
  type ExpenseStripItem,
  expenseStripMeta,
  findExpenseStripItem,
} from "@/features/money/money-expenses-strip";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
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

type ExpensesPanelViewModel = AgencyMoneySurfaceViewModel["bills"]["expensesPanel"];

type AgencyMoneyExpenseDetailSheetProps = {
  panel: ExpensesPanelViewModel;
};

function expenseStatusVariant(
  status: ExpenseStripItem["status"],
): "success" | "warning" | "outline" {
  switch (status) {
    case "paid":
      return "success";
    case "due":
      return "warning";
    case "partial":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function ExpenseDetailValue({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[0.6875rem] text-muted">{label}</dt>
      <dd className={cn("text-sm text-highlighted", className)}>{value}</dd>
    </div>
  );
}

export function AgencyMoneyExpenseDetailSheet({ panel }: AgencyMoneyExpenseDetailSheetProps) {
  const item = findExpenseStripItem(panel.strip.items, panel.selectedRowId);
  const disabled = panel.create.isPending || panel.payment.isPending;

  return (
    <Sheet
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) panel.onCloseExpenseDetail();
      }}
    >
      <SheetContent
        side={panel.sheetSide}
        className="data-[side=bottom]:max-h-[calc(100dvh-1rem)] data-[side=right]:sm:max-w-lg"
      >
        {item ? (
          <>
            <SheetHeader className="border-b border-default pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{item.name}</SheetTitle>
                <Badge variant={expenseStatusVariant(item.status)}>{item.statusLabel}</Badge>
              </div>
              <SheetDescription>Expense details</SheetDescription>
              <div className="flex items-baseline justify-between gap-3 pt-3">
                <span className="text-xs text-muted">Remaining</span>
                <span
                  className={cn(
                    "font-mono text-lg font-semibold tabular-nums",
                    item.remainingAmount > 0 ? "text-warning" : "text-muted",
                  )}
                >
                  {item.remainingLabel}
                </span>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                <ExpenseDetailValue
                  label="Kind"
                  value={item.kind === "subscription" ? "Subscription" : "One-time"}
                />
                <ExpenseDetailValue label="Meta" value={expenseStripMeta(item)} />
                <ExpenseDetailValue label="Note" value={item.note?.trim() || "None"} />
                <ExpenseDetailValue
                  label="Amount"
                  value={item.amountLabel}
                  className="font-mono tabular-nums"
                />
                <ExpenseDetailValue
                  label="Remaining"
                  value={item.remainingLabel}
                  className={cn(
                    "font-mono tabular-nums",
                    item.remainingAmount > 0 ? "text-warning" : "text-muted",
                  )}
                />
              </dl>
            </div>

            <SheetFooter className="border-t border-default bg-popover">
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() => panel.onOpenEdit(item.expenseId)}
              >
                Edit
              </Button>
              {item.canRecordPayment ? (
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => panel.onOpenPayment(item.expenseId)}
                >
                  {item.kind === "subscription" ? "Pay" : "Record"}
                </Button>
              ) : null}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
