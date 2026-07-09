import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { orpc } from "@/lib/orpc";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";

export type LaneId = "draft" | "sent" | "paid";

export type AgencyBillingSurfaceViewModel = {
  teamId: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  anyInvoices: boolean;
  summary: {
    outstandingCents: number;
    draftCount: number;
    sentCount: number;
    paidCount: number;
    currency: string;
  } | null;
  clients: Array<{ id: string; name: string }>;
  invoices: Array<{
    id: string;
    number: string;
    clientName: string;
    amountCents: number;
    currency: string;
    status: LaneId;
    periodStart: string;
    periodEnd: string;
  }>;
  createPanelOpen: boolean;
  selectedClientId: string;
  periodStart: string;
  periodEnd: string;
  createFormValid: boolean;
  pendingStatusInvoiceId: string | null;
  isInvoiceMutationPending: boolean;
  setCreatePanelOpen: (open: boolean) => void;
  setSelectedClientId: (clientId: string) => void;
  setPeriodStart: (start: string) => void;
  setPeriodEnd: (end: string) => void;
  openCreatePanel: () => void;
  generateDraft: () => Promise<void>;
  advanceInvoiceStatus: (invoiceId: string, currentStatus: LaneId) => Promise<void>;
  refetch: () => Promise<void>;
};

export function useAgencyBillingSurface(teamId: string): AgencyBillingSurfaceViewModel {
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
  const error = summaryQuery.error ?? invoicesQuery.error;
  const anyInvoices = invoices.length > 0;

  async function refetch() {
    await Promise.all([summaryQuery.refetch(), invoicesQuery.refetch()]);
  }

  return {
    teamId,
    isLoading,
    isError,
    error,
    anyInvoices,
    summary,
    clients,
    invoices,
    createPanelOpen,
    selectedClientId,
    periodStart,
    periodEnd,
    createFormValid,
    pendingStatusInvoiceId,
    isInvoiceMutationPending,
    setCreatePanelOpen,
    setSelectedClientId,
    setPeriodStart,
    setPeriodEnd,
    openCreatePanel,
    generateDraft,
    advanceInvoiceStatus,
    refetch,
  };
}
