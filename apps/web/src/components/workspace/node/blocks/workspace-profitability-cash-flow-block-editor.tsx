import {
  createWorkspaceExpenseItem,
  createWorkspaceProfitabilityClient,
  getExpenseSharePercent,
  getProfitabilityCashFlowSummary,
  getProfitabilityClientMarginPercent,
  workspaceFinancePaymentStatusLabels,
  type WorkspaceFinancePaymentStatus,
  type WorkspaceProfitabilityCashFlowBlock,
} from "@brainiac/workspace";
import { Calculator, Percent, Plus, Receipt, Trash2, TrendingDown, TrendingUp, Users2, Wallet } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockFieldLabel } from "@/components/workspace/node/blocks/shared/block-field-label";
import { BlockSelect } from "@/components/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const paymentStatusOptions = Object.entries(workspaceFinancePaymentStatusLabels).map(
  ([value, label]) => ({
    label,
    value: value as WorkspaceFinancePaymentStatus,
  }),
);

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toInteger(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.round(numeric));
}

function getMarginTone(marginPercent: number) {
  if (marginPercent > 40) {
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
      badgeVariant: "success" as const,
    };
  }

  if (marginPercent > 20) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
      badgeVariant: "warning" as const,
    };
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/10",
    icon: "bg-destructive/10 text-destructive",
    badgeVariant: "destructive" as const,
  };
}

function getProfitTone(value: number) {
  if (value > 0) {
    return {
      text: "text-success",
      bg: "bg-success/5",
      border: "border-success/10",
      icon: "bg-success/10 text-success",
    };
  }

  if (value === 0) {
    return {
      text: "text-warning",
      bg: "bg-warning/5",
      border: "border-warning/10",
      icon: "bg-warning/10 text-warning",
    };
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/10",
    icon: "bg-destructive/10 text-destructive",
  };
}

function getHealthProgressTone(healthPercent: number) {
  if (healthPercent >= 75) {
    return "bg-success";
  }

  if (healthPercent >= 50) {
    return "bg-warning";
  }

  return "bg-destructive";
}

export function WorkspaceProfitabilityCashFlowBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceProfitabilityCashFlowBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getProfitabilityCashFlowSummary(block), [block]);
  const totalExpenseBreakdown = useMemo(
    () => block.expenses.reduce((sum, expense) => sum + expense.amountEgp, 0),
    [block.expenses],
  );

  const revenueTone = getProfitTone(summary.totalRevenue > 0 ? 1 : 0);
  const expenseTone = getProfitTone(-1);
  const profitTone = getProfitTone(summary.totalProfit);
  const marginTone = getMarginTone(summary.marginPercent);

  function addClient() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.clients.push(createWorkspaceProfitabilityClient());
    });
  }

  function removeClient(clientId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.clients = entry.clients.filter((client) => client.id !== clientId);
    });
  }

  function addExpense() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.expenses.push(createWorkspaceExpenseItem());
    });
  }

  function removeExpense(expenseId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      entry.expenses = entry.expenses.filter((expense) => expense.id !== expenseId);
    });
  }

  function mutateClient(
    clientId: string,
    mutator: (client: WorkspaceProfitabilityCashFlowBlock["clients"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      const target = entry.clients.find((candidate) => candidate.id === clientId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function mutateExpense(
    expenseId: string,
    mutator: (expense: WorkspaceProfitabilityCashFlowBlock["expenses"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "profitability-cash-flow") {
        return;
      }

      const target = entry.expenses.find((candidate) => candidate.id === expenseId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">Cash Flow Overview</h2>
            <p className="text-xs text-muted-foreground">
              Real-time profitability and margin metrics across all clients.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cn("rounded-3xl border p-5 transition-colors", revenueTone.bg, revenueTone.border)}>
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl text-success",
                  revenueTone.icon,
                )}
              >
                <TrendingUp className="size-[18px]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Revenue
              </p>
            </div>
            <p className="mt-3 truncate font-mono text-2xl font-black tracking-tight text-success sm:text-3xl">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>

          <div className={cn("rounded-3xl border p-5 transition-colors", expenseTone.bg, expenseTone.border)}>
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl text-destructive",
                  expenseTone.icon,
                )}
              >
                <TrendingDown className="size-[18px]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Expenses
              </p>
            </div>
            <p className="mt-3 truncate font-mono text-2xl font-black tracking-tight text-destructive sm:text-3xl">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>

          <div className={cn("rounded-3xl border p-5 transition-colors", profitTone.bg, profitTone.border)}>
            <div className="flex items-center gap-2.5">
              <div className={cn("flex size-8 items-center justify-center rounded-xl", profitTone.icon)}>
                <Wallet className="size-[18px]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Net Profit
              </p>
            </div>
            <p
              className={cn(
                "mt-3 truncate font-mono text-2xl font-black tracking-tight sm:text-3xl",
                profitTone.text,
              )}
            >
              {formatCurrency(summary.totalProfit)}
            </p>
          </div>

          <div className={cn("rounded-3xl border p-5 transition-colors", marginTone.bg, marginTone.border)}>
            <div className="flex items-center gap-2.5">
              <div className={cn("flex size-8 items-center justify-center rounded-xl", marginTone.icon)}>
                <Percent className="size-[18px]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Margin
              </p>
            </div>
            <p
              className={cn(
                "mt-3 truncate font-mono text-2xl font-black tracking-tight sm:text-3xl",
                marginTone.text,
              )}
            >
              {summary.marginPercent}%
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Client Portfolio</h2>
              <p className="text-xs text-muted-foreground">
                Track profitability, margins, and collection status per client.
              </p>
            </div>

            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={addClient}>
              <Plus />
              Add Client
            </Button>
          </div>

          {block.clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/10 text-muted-foreground/30">
                <Users2 className="size-8" />
              </div>
              <p className="mt-4 text-sm font-bold text-muted-foreground">No clients yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Add your first client to track profitability
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addClient}>
                <Plus />
                Add first client
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {block.clients.map((client) => {
                const clientMargin = getProfitabilityClientMarginPercent(client);
                const clientMarginTone = getMarginTone(clientMargin);

                return (
                  <article
                    key={client.id}
                    className="group relative rounded-2xl border border-muted/20 bg-background/40 p-5 transition-all hover:border-muted/30"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4 border-b border-muted/10 pb-4">
                      <div className="min-w-0 flex-1">
                        <Input
                          value={client.name}
                          placeholder="Client name"
                          className="border-0 bg-transparent px-0 text-xl font-black tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.name = event.target.value.slice(0, 120);
                            })
                          }
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant={clientMarginTone.badgeVariant}
                          className="rounded-xl px-3 py-1 font-mono font-bold"
                        >
                          {clientMargin}% margin
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove client"
                          onClick={() => removeClient(client.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <BlockFieldLabel className="mb-2 block">Payment Status</BlockFieldLabel>
                        <BlockSelect
                          value={client.paymentStatus}
                          options={paymentStatusOptions}
                          className="rounded-xl"
                          aria-label="Payment status"
                          onValueChange={(value) =>
                            mutateClient(client.id, (target) => {
                              target.paymentStatus = value as WorkspaceFinancePaymentStatus;
                            })
                          }
                        />
                      </div>

                      <div>
                        <BlockFieldLabel className="mb-2 block">Revenue (EGP)</BlockFieldLabel>
                        <Input
                          value={String(client.revenueEgp)}
                          type="number"
                          className="rounded-xl font-mono text-success"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.revenueEgp = toInteger(event.target.value, target.revenueEgp);
                            })
                          }
                        />
                      </div>

                      <div>
                        <BlockFieldLabel className="mb-2 block">Direct Cost (EGP)</BlockFieldLabel>
                        <Input
                          value={String(client.costEgp)}
                          type="number"
                          className="rounded-xl font-mono text-destructive"
                          onChange={(event) =>
                            mutateClient(client.id, (target) => {
                              target.costEgp = toInteger(event.target.value, target.costEgp);
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-muted/10 bg-muted/10 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <BlockFieldLabel>Relationship Health</BlockFieldLabel>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={String(client.healthPercent)}
                            type="number"
                            className="h-auto w-10 border-0 bg-transparent p-0 text-right font-mono font-bold text-primary shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateClient(client.id, (target) => {
                                target.healthPercent = Math.min(
                                  100,
                                  toInteger(event.target.value, target.healthPercent),
                                );
                              })
                            }
                          />
                          <span className="text-xs font-black text-primary/60">%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/20">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            getHealthProgressTone(client.healthPercent),
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, client.healthPercent))}%` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5 rounded-2xl border border-muted/20 bg-muted/5 p-6 lg:sticky lg:top-8 lg:h-fit">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black tracking-tight text-foreground">Monthly Overhead</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Recurring operating costs.</p>
            </div>

            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={addExpense}>
              <Plus />
              Add
            </Button>
          </div>

          {block.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted/20 bg-muted/5 py-8 text-center">
              <Receipt className="size-6 text-muted-foreground/30" />
              <p className="mt-3 text-xs font-bold text-muted-foreground">No overhead costs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {block.expenses.map((expense) => (
                <article
                  key={expense.id}
                  className="relative rounded-xl border border-muted/10 bg-background/40 p-4 transition-all hover:bg-background/60"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Input
                        value={expense.category}
                        placeholder="Category name"
                        className="border-0 bg-transparent px-0 text-sm font-bold text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
                        onChange={(event) =>
                          mutateExpense(expense.id, (target) => {
                            target.category = event.target.value.slice(0, 120);
                          })
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove expense"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <BlockFieldLabel className="mb-1.5 block">Monthly (EGP)</BlockFieldLabel>
                      <Input
                        value={String(expense.amountEgp)}
                        type="number"
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateExpense(expense.id, (target) => {
                            target.amountEgp = toInteger(event.target.value, target.amountEgp);
                          })
                        }
                      />
                    </div>

                    <div className="pb-0.5 text-right">
                      <p className="font-mono text-xs font-black text-muted-foreground/60">
                        {getExpenseSharePercent(expense, totalExpenseBreakdown)}%
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    Total Monthly
                  </p>
                  <p className="mt-1 font-mono text-lg font-black tracking-tight text-primary">
                    {formatCurrency(totalExpenseBreakdown)}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
