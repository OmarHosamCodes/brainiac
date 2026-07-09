import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AlertTriangle, CornerDownRight, Info, Plus, Receipt, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { agencyLabelClass, agencyMetricClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { selectIsInvoiceMutationPending, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";

type AgencyBillingSurfaceProps = {
  teamId: string;
};

type LaneId = "draft" | "sent" | "paid";

const LANES: Array<{ id: LaneId; label: string; copy: string }> = [
  { id: "draft", label: "Draft", copy: "Built from a closed week, still editable." },
  { id: "sent", label: "Sent", copy: "Delivered to the client, awaiting payment." },
  { id: "paid", label: "Paid", copy: "Reconciled and closed." },
];

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const same = startDate.getUTCMonth() === endDate.getUTCMonth();
  const startLabel = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: same ? "numeric" : "short",
    day: "numeric",
  });
  return `${startLabel} to ${endLabel}`;
}

export function AgencyBillingSurface({ teamId }: AgencyBillingSurfaceProps) {
  const agencyOps = useAgencyOpsStore();
  const isInvoiceMutationPending = useAgencyOpsStore(selectIsInvoiceMutationPending);

  const summaryQuery = useQuery({
    ...orpc.agencyOps.invoices.summary.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const invoicesQuery = useQuery({
    ...orpc.agencyOps.invoices.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: { teamId, page: 1, pageSize: 200 },
    }),
    enabled: Boolean(teamId),
  });

  const summary = summaryQuery.data ?? null;
  const invoices = invoicesQuery.data?.items ?? [];
  const clients = clientsQuery.data?.items ?? [];

  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [pendingStatusInvoiceId, setPendingStatusInvoiceId] = useState<string | null>(null);

  const createFormValid = useMemo(
    () =>
      Boolean(selectedClientId) &&
      Boolean(periodStart) &&
      Boolean(periodEnd) &&
      periodEnd >= periodStart,
    [periodEnd, periodStart, selectedClientId],
  );

  function laneItems(laneId: LaneId) {
    return invoices.filter((invoice) => invoice.status === laneId);
  }

  function laneCount(laneId: LaneId): number {
    if (!summary) return 0;
    if (laneId === "draft") return summary.draftCount;
    if (laneId === "sent") return summary.sentCount;
    return summary.paidCount;
  }

  function openCreatePanel() {
    setSelectedClientId("");
    setPeriodStart("");
    setPeriodEnd("");
    setCreatePanelOpen(true);
  }

  async function generateDraft() {
    if (!createFormValid) return;
    const client = clients.find((c) => c.id === selectedClientId);
    await agencyOps.createInvoice(
      {
        teamId,
        clientId: selectedClientId,
        clientName: client?.name ?? "",
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      },
      { onSuccess: () => setCreatePanelOpen(false) },
    );
  }

  async function advanceInvoiceStatus(invoiceId: string, currentStatus: LaneId) {
    const nextStatus = currentStatus === "draft" ? "sent" : "paid";
    setPendingStatusInvoiceId(invoiceId);
    await agencyOps.updateInvoiceStatus(
      { teamId, invoiceId, status: nextStatus },
      { onSuccess: () => setPendingStatusInvoiceId(null) },
    );
    setPendingStatusInvoiceId(null);
  }

  const isLoading = summaryQuery.isPending || invoicesQuery.isPending;
  const isError = summaryQuery.isError || invoicesQuery.isError;
  const anyInvoices = invoices.length > 0;

  return (
    <div className="agency-billing space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load billing.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(summaryQuery.error ?? invoicesQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              void summaryQuery.refetch();
              void invoicesQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {summary ? (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-default pb-3 text-xs">
              <div>
                <span className={agencyLabelClass}>Outstanding</span>
                <span
                  className={cn(
                    "ml-2 font-mono tabular-nums font-bold",
                    summary.outstandingCents > 0 ? "text-highlighted" : "text-dimmed",
                  )}
                >
                  {formatCurrency(summary.outstandingCents, summary.currency)}
                </span>
              </div>
              <div>
                <span className={agencyLabelClass}>Drafts</span>
                <span
                  className={cn(
                    "ml-2",
                    agencyMetricClass,
                    summary.draftCount > 0 ? "" : "text-dimmed",
                  )}
                >
                  {summary.draftCount}
                </span>
              </div>
              <div>
                <span className={agencyLabelClass}>Sent</span>
                <span
                  className={cn(
                    "ml-2",
                    agencyMetricClass,
                    summary.sentCount > 0 ? "" : "text-dimmed",
                  )}
                >
                  {summary.sentCount}
                </span>
              </div>
              <div>
                <span className={agencyLabelClass}>Paid · all time</span>
                <span
                  className={cn(
                    "ml-2",
                    agencyMetricClass,
                    summary.paidCount > 0 ? "" : "text-dimmed",
                  )}
                >
                  {summary.paidCount}
                </span>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            {LANES.map((lane) => (
              <article key={lane.id} className="rounded-2xl border border-default bg-default">
                <header className="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                      {lane.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{lane.copy}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-[11px] font-bold tabular-nums",
                        laneCount(lane.id) > 0 ? "text-highlighted" : "text-dimmed",
                      )}
                    >
                      {laneCount(lane.id)}
                    </span>
                    {lane.id === "draft" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="New invoice"
                        onClick={openCreatePanel}
                      >
                        <Plus />
                      </Button>
                    ) : null}
                  </div>
                </header>

                {laneItems(lane.id).length > 0 ? (
                  <ul className="divide-y divide-default">
                    {laneItems(lane.id).map((invoice) => (
                      <li key={invoice.id} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-xs font-bold text-highlighted">
                            {invoice.number}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-highlighted">
                            {formatCurrency(invoice.amountCents, invoice.currency)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted">{invoice.clientName}</p>
                        <p className="mt-1 truncate text-[11px] text-dimmed">
                          {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                        </p>
                        {lane.id !== "paid" ? (
                          <div className="mt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isInvoiceMutationPending}
                              onClick={() => void advanceInvoiceStatus(invoice.id, lane.id)}
                            >
                              {pendingStatusInvoiceId === invoice.id
                                ? "Updating…"
                                : lane.id === "draft"
                                  ? "Mark sent"
                                  : "Mark paid"}
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[11px] text-dimmed">
                      No {lane.label.toLowerCase()} invoices.
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>

          {createPanelOpen ? (
            <div className="rounded-2xl border border-default bg-default">
              <div className="flex items-center justify-between border-b border-default px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                    New invoice
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-highlighted">
                    Draft from a closed period
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  onClick={() => setCreatePanelOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold text-muted">Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-default bg-background px-2 text-sm"
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted">Billing period</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-[11px] text-muted">to</span>
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-default px-5 py-4">
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                  <p className="text-[11px] text-muted">
                    Line items are generated from approved time entries in the selected period.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    disabled={!createFormValid || isInvoiceMutationPending}
                    onClick={() => void generateDraft()}
                  >
                    Generate draft
                  </Button>
                  <Button variant="ghost" onClick={() => setCreatePanelOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!anyInvoices ? (
            <div className="rounded-2xl border border-dashed border-default bg-muted/20 p-6">
              <div className="flex items-start gap-3">
                <Receipt className="mt-0.5 size-5 shrink-0 text-muted" />
                <div>
                  <p className="text-sm font-bold text-highlighted">No invoices yet.</p>
                  <p className="mt-1 text-xs text-muted">
                    Bill your first period from a closed week. Invoices flow through draft, sent,
                    and paid lanes; the period-close checklist guides each cycle.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[11px] text-muted">
                    <li className="flex items-start gap-2">
                      <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-dimmed" />
                      <span>Lock a week to draft invoices from approved time entries.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-dimmed" />
                      <span>
                        Send as PDF or push to QuickBooks · Xero from Settings · Integrations.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-dimmed" />
                      <span>Mark paid to close the period and reconcile against your books.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
