import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsExpense,
  agencyOpsFxRate,
  agencyOpsInvoice,
  agencyOpsMemberRate,
  agencyOpsMoneyPendingAdjustment,
  agencyOpsMoneySettings,
  agencyOpsPayoutRun,
} from "@orch/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { requireTeamMembership } from "../shared/membership";
import {
  MoneyCurrencyError,
  normalizeCurrencyCode,
  resolveMoneyValue,
  type MoneyFxRateRow,
  type ResolvedMoneyValue,
} from "./money-currency";

const ISO_CURRENCY = /^[A-Z]{3}$/;

export type AgencyFxRateRecord = {
  id: string;
  teamId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  updatedAt: string;
};

function mapFxRow(row: typeof agencyOpsFxRate.$inferSelect): AgencyFxRateRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: row.rate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadAgencyCurrency(
  teamId: string,
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  const [row] = await db
    .select({
      currency: agencyOpsMoneySettings.currency,
      currencyLockedAt: agencyOpsMoneySettings.currencyLockedAt,
    })
    .from(agencyOpsMoneySettings)
    .where(eq(agencyOpsMoneySettings.teamId, teamId))
    .limit(1);

  return {
    currency: normalizeCurrencyCode(row?.currency ?? "USD"),
    currencyLockedAt: row?.currencyLockedAt?.toISOString() ?? null,
  };
}

async function teamHasMoneyRecords(teamId: string): Promise<boolean> {
  const checks = await Promise.all([
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsMemberRate)
      .where(eq(agencyOpsMemberRate.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsInvoice)
      .where(eq(agencyOpsInvoice.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsPayoutRun)
      .where(eq(agencyOpsPayoutRun.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsExpense)
      .where(eq(agencyOpsExpense.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsMoneyPendingAdjustment)
      .where(eq(agencyOpsMoneyPendingAdjustment.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsClient)
      .where(
        and(
          eq(agencyOpsClient.teamId, teamId),
          sql`${agencyOpsClient.billableRateAmount} is not null`,
        ),
      )
      .limit(1),
  ]);

  return checks.some((rows) => rows.length > 0);
}

async function ensureAgencyCurrencyLocked(teamId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId,
      currency: "USD",
      currencyLockedAt: now,
      rulesJson: { enabledRuleIds: [] },
      calcOptionsJson: { enabledOptionIds: [] },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        currencyLockedAt: sql`COALESCE(${agencyOpsMoneySettings.currencyLockedAt}, ${now})`,
        updatedAt: now,
      },
    });
}

async function listTeamFxRateRows(teamId: string): Promise<MoneyFxRateRow[]> {
  const rows = await db
    .select({
      fromCurrency: agencyOpsFxRate.fromCurrency,
      toCurrency: agencyOpsFxRate.toCurrency,
      rate: agencyOpsFxRate.rate,
    })
    .from(agencyOpsFxRate)
    .where(eq(agencyOpsFxRate.teamId, teamId));
  return rows;
}

/** Public read of agency currency (membership required). */
export async function getAgencyCurrency(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  return loadAgencyCurrency(input.teamId);
}

/**
 * Resolve a source amount into agency currency and soft-lock team currency.
 * Caller must already have required team membership.
 */
export async function resolveMoneyForTeam(
  actorUserId: string,
  input: { teamId: string; sourceAmount: number; sourceCurrency: string },
): Promise<ResolvedMoneyValue & { agencyCurrency: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  const { currency: agencyCurrency } = await loadAgencyCurrency(input.teamId);
  const rates = await listTeamFxRateRows(input.teamId);
  try {
    const resolved = resolveMoneyValue({
      sourceAmount: input.sourceAmount,
      sourceCurrency: input.sourceCurrency || agencyCurrency,
      agencyCurrency,
      rates,
    });
    await ensureAgencyCurrencyLocked(input.teamId);
    return { ...resolved, agencyCurrency };
  } catch (error) {
    if (error instanceof MoneyCurrencyError) {
      throw new ORPCError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}

export async function listFxRates(
  actorUserId: string,
  input: { teamId: string },
): Promise<{
  items: AgencyFxRateRecord[];
  agencyCurrency: string;
  currencyLockedAt: string | null;
}> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  const agency = await loadAgencyCurrency(input.teamId);
  const rows = await db
    .select()
    .from(agencyOpsFxRate)
    .where(eq(agencyOpsFxRate.teamId, input.teamId));
  return {
    items: rows.map(mapFxRow),
    agencyCurrency: agency.currency,
    currencyLockedAt: agency.currencyLockedAt,
  };
}

export async function upsertFxRate(
  actorUserId: string,
  input: {
    teamId: string;
    fromCurrency: string;
    toCurrency: string;
    rate: string;
    id?: string;
  },
): Promise<AgencyFxRateRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const fromCurrency = normalizeCurrencyCode(input.fromCurrency);
  const toCurrency = normalizeCurrencyCode(input.toCurrency);
  if (!ISO_CURRENCY.test(fromCurrency) || !ISO_CURRENCY.test(toCurrency)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }
  if (fromCurrency === toCurrency) {
    throw new ORPCError("BAD_REQUEST", { message: "fromCurrency and toCurrency must differ." });
  }
  const rateNum = Number(input.rate);
  if (!Number.isFinite(rateNum) || rateNum <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Rate must be a positive number." });
  }
  const rate = String(rateNum);
  const now = new Date();

  const [row] = await db
    .insert(agencyOpsFxRate)
    .values({
      id: input.id ?? createWorkspaceId("agency-fx"),
      teamId: input.teamId,
      fromCurrency,
      toCurrency,
      rate,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsFxRate.teamId, agencyOpsFxRate.fromCurrency, agencyOpsFxRate.toCurrency],
      set: {
        rate,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapFxRow(row);
}

export async function deleteFxRate(
  actorUserId: string,
  input: { teamId: string; id: string },
): Promise<{ ok: true }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  const deleted = await db
    .delete(agencyOpsFxRate)
    .where(and(eq(agencyOpsFxRate.teamId, input.teamId), eq(agencyOpsFxRate.id, input.id)))
    .returning({ id: agencyOpsFxRate.id });
  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "FX rate was not found." });
  }
  return { ok: true };
}

export async function setAgencyCurrency(
  actorUserId: string,
  input: { teamId: string; currency: string },
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const currency = normalizeCurrencyCode(input.currency);
  if (!ISO_CURRENCY.test(currency)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }

  const existing = await loadAgencyCurrency(input.teamId);
  if (existing.currencyLockedAt || (await teamHasMoneyRecords(input.teamId))) {
    if (existing.currency !== currency) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Currency locked after money exists.",
      });
    }
    return existing;
  }

  const now = new Date();
  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId: input.teamId,
      currency,
      currencyLockedAt: null,
      rulesJson: { enabledRuleIds: [] },
      calcOptionsJson: { enabledOptionIds: [] },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        currency,
        updatedAt: now,
      },
    });

  return { currency, currencyLockedAt: null };
}

/** Frankfurter live suggest — does not persist. */
export async function suggestFxRate(
  actorUserId: string,
  input: { teamId: string; fromCurrency: string; toCurrency: string },
): Promise<{ rate: string; asOf: string; provider: "frankfurter" }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const from = normalizeCurrencyCode(input.fromCurrency);
  const to = normalizeCurrencyCode(input.toCurrency);
  if (!ISO_CURRENCY.test(from) || !ISO_CURRENCY.test(to)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }
  if (from === to) {
    return { rate: "1", asOf: new Date().toISOString(), provider: "frankfurter" };
  }

  const url = `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ORPCError("BAD_GATEWAY", { message: "Could not reach FX provider." });
  }
  if (!response.ok) {
    throw new ORPCError("BAD_GATEWAY", {
      message: `FX provider returned ${response.status}.`,
    });
  }

  const body = (await response.json()) as { rate?: number; date?: string };
  if (typeof body.rate !== "number" || !Number.isFinite(body.rate) || body.rate <= 0) {
    throw new ORPCError("BAD_GATEWAY", { message: "FX provider returned an invalid rate." });
  }

  const asOf = body.date
    ? new Date(`${body.date}T00:00:00.000Z`).toISOString()
    : new Date().toISOString();

  return {
    rate: String(body.rate),
    asOf,
    provider: "frankfurter",
  };
}
