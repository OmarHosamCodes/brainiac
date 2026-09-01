/** Immediate invoice apply/reverse for period-scoped client bill adjustments. */

import { db } from "@orch/db";
import {
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  type AgencyOpsInvoiceStatus,
} from "@orch/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { invoiceStatusAfterReceived } from "./invoice-bill-status";
import {
  pendingAdjustmentKindLabel,
  signedClientAdjustmentAmount,
  type MoneyPendingAdjustmentKind,
} from "./money-bill-carry";

export { isInvoiceObligationId } from "./money-bill-carry";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function adjustmentLineDescription(kind: MoneyPendingAdjustmentKind, note: string): string {
  return note || pendingAdjustmentKindLabel(kind);
}

async function loadInvoiceForClient(
  tx: DbTx,
  input: { teamId: string; invoiceId: string; clientId: string },
): Promise<{
  id: string;
  amount: number;
  sourceAmount: number | null;
  receivedAmount: number;
  status: AgencyOpsInvoiceStatus;
}> {
  const [invoice] = await tx
    .select({
      id: agencyOpsInvoice.id,
      amount: agencyOpsInvoice.amount,
      sourceAmount: agencyOpsInvoice.sourceAmount,
      receivedAmount: agencyOpsInvoice.receivedAmount,
      status: agencyOpsInvoice.status,
      clientId: agencyOpsInvoice.clientId,
    })
    .from(agencyOpsInvoice)
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!invoice) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }
  if (invoice.clientId !== input.clientId) {
    throw new ORPCError("BAD_REQUEST", { message: "Invoice does not belong to this client." });
  }
  if (invoice.status === "refunded") {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot adjust a refunded invoice." });
  }

  return {
    id: invoice.id,
    amount: invoice.amount,
    sourceAmount: invoice.sourceAmount,
    receivedAmount: invoice.receivedAmount ?? 0,
    status: invoice.status,
  };
}

export function nextInvoiceTotalsAfterDelta(
  invoice: {
    amount: number;
    sourceAmount: number | null;
    receivedAmount: number;
  },
  signedDelta: number,
): { amount: number; sourceAmount: number } {
  const nextAmount = invoice.amount + signedDelta;
  if (nextAmount < 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Adjustment would reduce the bill below zero." });
  }
  if (nextAmount < invoice.receivedAmount) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Adjustment would leave received greater than the bill total.",
    });
  }
  return {
    amount: nextAmount,
    sourceAmount: Math.max(0, (invoice.sourceAmount ?? invoice.amount) + signedDelta),
  };
}

async function writeInvoiceAmount(
  tx: DbTx,
  invoice: {
    id: string;
    amount: number;
    sourceAmount: number | null;
    receivedAmount: number;
    status: AgencyOpsInvoiceStatus;
  },
  signedDelta: number,
): Promise<void> {
  const next = nextInvoiceTotalsAfterDelta(invoice, signedDelta);
  const nextStatus = invoiceStatusAfterReceived(
    next.amount,
    invoice.receivedAmount,
    invoice.status,
  );

  await tx
    .update(agencyOpsInvoice)
    .set({
      amount: next.amount,
      sourceAmount: next.sourceAmount,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsInvoice.id, invoice.id));
}

export async function applyInvoiceClientAdjustment(
  tx: DbTx,
  input: {
    teamId: string;
    clientId: string;
    invoiceId: string;
    kind: MoneyPendingAdjustmentKind;
    amount: number;
    note: string;
    existingLineItemId?: string | null;
  },
): Promise<{ appliedInvoiceId: string; invoiceLineItemId: string }> {
  const invoice = await loadInvoiceForClient(tx, {
    teamId: input.teamId,
    invoiceId: input.invoiceId,
    clientId: input.clientId,
  });
  const signedDelta = signedClientAdjustmentAmount(input.kind, input.amount);
  const description = adjustmentLineDescription(input.kind, input.note);
  const now = new Date();

  if (input.existingLineItemId) {
    const [existing] = await tx
      .select({ id: agencyOpsInvoiceLineItem.id, amount: agencyOpsInvoiceLineItem.amount })
      .from(agencyOpsInvoiceLineItem)
      .where(eq(agencyOpsInvoiceLineItem.id, input.existingLineItemId))
      .limit(1);
    if (existing) {
      await writeInvoiceAmount(tx, invoice, signedDelta - existing.amount);
      await tx
        .update(agencyOpsInvoiceLineItem)
        .set({ description, amount: signedDelta })
        .where(eq(agencyOpsInvoiceLineItem.id, existing.id));
      return { appliedInvoiceId: invoice.id, invoiceLineItemId: existing.id };
    }
  }

  await writeInvoiceAmount(tx, invoice, signedDelta);
  const lineItemId = createWorkspaceId("agency-li");
  await tx.insert(agencyOpsInvoiceLineItem).values({
    id: lineItemId,
    invoiceId: invoice.id,
    description,
    projectId: null,
    durationSeconds: 0,
    rateAmount: 0,
    amount: signedDelta,
    fromTimeEntries: false,
    createdAt: now,
  });

  return { appliedInvoiceId: invoice.id, invoiceLineItemId: lineItemId };
}

export async function reverseInvoiceClientAdjustment(
  tx: DbTx,
  input: {
    teamId: string;
    clientId: string;
    invoiceId: string;
    invoiceLineItemId: string | null;
    kind: MoneyPendingAdjustmentKind;
    amount: number;
  },
): Promise<void> {
  const invoice = await loadInvoiceForClient(tx, {
    teamId: input.teamId,
    invoiceId: input.invoiceId,
    clientId: input.clientId,
  });
  const signedDelta = signedClientAdjustmentAmount(input.kind, input.amount);

  if (input.invoiceLineItemId) {
    await tx
      .delete(agencyOpsInvoiceLineItem)
      .where(eq(agencyOpsInvoiceLineItem.id, input.invoiceLineItemId));
  }

  await writeInvoiceAmount(tx, invoice, -signedDelta);
}
