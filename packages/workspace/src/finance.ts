import { getDueDateValue, getTodayValue, trimToEmpty } from "./shared";
import type {
  WorkspaceCollectionsTrackerBlock,
  WorkspaceCollectionsTrackerSummary,
  WorkspaceExpenseItem,
  WorkspaceFinancePaymentStatus,
  WorkspacePricingSimulatorBlock,
  WorkspacePricingSimulatorSummary,
  WorkspaceProfitabilityCashFlowBlock,
  WorkspaceProfitabilityCashFlowSummary,
  WorkspaceProfitabilityClient,
  WorkspaceReceivableFilter,
  WorkspaceReceivableInvoice,
  WorkspaceReceivableRiskLevel,
  WorkspaceReceivableStatus,
} from "./types";

export const workspaceFinancePaymentStatusLabels: Record<WorkspaceFinancePaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
};

export const workspaceReceivableStatusLabels: Record<WorkspaceReceivableStatus, string> = {
  paid: "Paid",
  "due-soon": "Due Soon",
  partial: "Partial",
  overdue: "Overdue",
};

export const workspaceReceivableFilterLabels: Record<WorkspaceReceivableFilter, string> = {
  all: "All",
  overdue: "Overdue",
  "high-risk": "High Risk",
  "due-this-week": "Due This Week",
};

export const workspaceReceivableRiskLevelLabels: Record<WorkspaceReceivableRiskLevel, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

export function getProfitabilityClientMarginPercent(client: WorkspaceProfitabilityClient) {
  if (client.revenueEgp <= 0) {
    return 0;
  }

  return Math.round(((client.revenueEgp - client.costEgp) / client.revenueEgp) * 100);
}

export function getExpenseSharePercent(item: WorkspaceExpenseItem, totalExpenses: number) {
  if (totalExpenses <= 0) {
    return 0;
  }

  return Math.round((item.amountEgp / totalExpenses) * 100);
}

export function getProfitabilityCashFlowSummary(
  block: WorkspaceProfitabilityCashFlowBlock,
): WorkspaceProfitabilityCashFlowSummary {
  const totalRevenue = block.clients.reduce((sum, client) => sum + client.revenueEgp, 0);
  const directCosts = block.clients.reduce((sum, client) => sum + client.costEgp, 0);
  const overheadExpenses = block.expenses.reduce((sum, expense) => sum + expense.amountEgp, 0);
  const totalExpenses = directCosts + overheadExpenses;
  const totalProfit = totalRevenue - totalExpenses;
  const rankedExpenses = [...block.expenses].sort(
    (left, right) => right.amountEgp - left.amountEgp,
  );

  return {
    clientCount: block.clients.length,
    totalRevenue,
    totalExpenses,
    totalProfit,
    marginPercent: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0,
    paidClients: block.clients.filter((client) => client.paymentStatus === "paid").length,
    partialClients: block.clients.filter((client) => client.paymentStatus === "partial").length,
    overdueClients: block.clients.filter((client) => client.paymentStatus === "overdue").length,
    topExpenseCategory: rankedExpenses[0]?.category ?? null,
  };
}

export function getPricingSimulatorSummary(
  block: WorkspacePricingSimulatorBlock,
): WorkspacePricingSimulatorSummary {
  const requiredRevenue =
    block.targetMarginPercent >= 100
      ? 0
      : Math.round(block.monthlyOverheadEgp / (1 - block.targetMarginPercent / 100));
  const projectedRevenue = Math.round(
    block.hourlyRateEgp * block.hoursPerClientPerMonth * block.activeClients,
  );

  return {
    activeClients: block.activeClients,
    monthlyClientHours: block.hoursPerClientPerMonth * block.activeClients,
    projectedRevenue,
    requiredRevenue,
    minimumRetainerPerClient:
      block.activeClients > 0 ? Math.round(requiredRevenue / block.activeClients) : 0,
    projectedProfit: projectedRevenue - block.monthlyOverheadEgp,
  };
}

export function getReceivableDaysOverdue(invoice: WorkspaceReceivableInvoice, now = new Date()) {
  if (!invoice.dueDate || invoice.status === "paid") {
    return 0;
  }

  const delta = Math.round((getTodayValue(now) - getDueDateValue(invoice.dueDate)) / 86_400_000);
  return Math.max(0, delta);
}

export function isReceivableDueThisWeek(invoice: WorkspaceReceivableInvoice, now = new Date()) {
  if (!invoice.dueDate || invoice.status === "paid") {
    return false;
  }

  const today = getTodayValue(now);
  const dueDateValue = getDueDateValue(invoice.dueDate);
  const delta = Math.round((dueDateValue - today) / 86_400_000);

  return delta >= 0 && delta <= 7;
}

export function getReceivableRiskLevel(
  invoice: WorkspaceReceivableInvoice,
  now = new Date(),
): WorkspaceReceivableRiskLevel {
  if (invoice.status === "paid") {
    return "low";
  }

  const daysOverdue = getReceivableDaysOverdue(invoice, now);
  const amount = invoice.amountEgp;

  if (daysOverdue >= 14 || (daysOverdue >= 7 && amount >= 40_000) || amount >= 100_000) {
    return "high";
  }

  if (
    daysOverdue > 0 ||
    invoice.status === "partial" ||
    (isReceivableDueThisWeek(invoice, now) && amount >= 25_000)
  ) {
    return "medium";
  }

  return "low";
}

export function matchesReceivableFilter(
  invoice: WorkspaceReceivableInvoice,
  filter: WorkspaceReceivableFilter,
  now = new Date(),
) {
  switch (filter) {
    case "overdue":
      return getReceivableDaysOverdue(invoice, now) > 0;
    case "high-risk":
      return getReceivableRiskLevel(invoice, now) === "high";
    case "due-this-week":
      return isReceivableDueThisWeek(invoice, now);
    default:
      return true;
  }
}

export function sortReceivableInvoices(invoices: WorkspaceReceivableInvoice[], now = new Date()) {
  return [...invoices].sort((left, right) => {
    const riskWeight = {
      low: 0,
      medium: 1,
      high: 2,
    } as const;
    const riskDelta =
      riskWeight[getReceivableRiskLevel(right, now)] -
      riskWeight[getReceivableRiskLevel(left, now)];

    if (riskDelta !== 0) {
      return riskDelta;
    }

    const overdueDelta = getReceivableDaysOverdue(right, now) - getReceivableDaysOverdue(left, now);

    if (overdueDelta !== 0) {
      return overdueDelta;
    }

    if (right.amountEgp !== left.amountEgp) {
      return right.amountEgp - left.amountEgp;
    }

    return trimToEmpty(left.clientName).localeCompare(trimToEmpty(right.clientName));
  });
}

export function getCollectionsTrackerSummary(
  block: WorkspaceCollectionsTrackerBlock,
  now = new Date(),
): WorkspaceCollectionsTrackerSummary {
  const totalOutstanding = block.invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + invoice.amountEgp, 0);
  const overdueInvoices = block.invoices.filter(
    (invoice) => getReceivableDaysOverdue(invoice, now) > 0,
  );
  const dueThisWeekInvoices = block.invoices.filter((invoice) =>
    isReceivableDueThisWeek(invoice, now),
  );
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    invoiceCount: block.invoices.length,
    totalOutstanding,
    overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.amountEgp, 0),
    dueThisWeekAmount: dueThisWeekInvoices.reduce((sum, invoice) => sum + invoice.amountEgp, 0),
    collectedThisMonth: block.invoices
      .filter(
        (invoice) =>
          invoice.status === "paid" && invoice.paidAt && invoice.paidAt.startsWith(currentMonth),
      )
      .reduce((sum, invoice) => sum + invoice.amountEgp, 0),
    highRiskCount: block.invoices.filter(
      (invoice) => getReceivableRiskLevel(invoice, now) === "high",
    ).length,
    overdueCount: overdueInvoices.length,
  };
}
