/**
 * Backfill agency currency + dual-store source/fx for existing money rows.
 *
 *   bun run --cwd apps/server src/operations/migrate-agency-money-amounts.ts
 *   bun run --cwd apps/server src/operations/migrate-agency-money-amounts.ts --apply
 *   TEAM_ID=... bun run --cwd apps/server src/operations/migrate-agency-money-amounts.ts --apply
 */
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
  workspaceTeam,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { eq } from "drizzle-orm";

const apply = process.argv.includes("--apply");
const teamIdFilter = Bun.env.TEAM_ID ?? null;

type CountMap = Record<string, number>;

function bump(map: CountMap, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase();
}

function dominantCurrency(codes: string[]): string {
  const counts: CountMap = {};
  for (const raw of codes) {
    bump(counts, normalizeCurrencyCode(raw || "USD"));
  }
  let best = "USD";
  let bestN = -1;
  for (const [code, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = code;
      bestN = n;
    }
  }
  return best;
}

function resolveLocal(input: {
  sourceAmount: number;
  sourceCurrency: string;
  agencyCurrency: string;
  rate: string;
}): {
  sourceAmount: number;
  sourceCurrency: string;
  amount: number;
  fxRate: string;
  fxAsOf: string;
} {
  const sourceCurrency = normalizeCurrencyCode(input.sourceCurrency);
  const agencyCurrency = normalizeCurrencyCode(input.agencyCurrency);
  const fxAsOf = new Date().toISOString();
  if (sourceCurrency === agencyCurrency) {
    return {
      sourceAmount: input.sourceAmount,
      sourceCurrency,
      amount: input.sourceAmount,
      fxRate: "1",
      fxAsOf,
    };
  }
  const multiplier = Number(input.rate);
  return {
    sourceAmount: input.sourceAmount,
    sourceCurrency,
    amount: Math.round(input.sourceAmount * multiplier),
    fxRate: input.rate,
    fxAsOf,
  };
}

async function fetchFrankfurterRate(from: string, to: string): Promise<string | null> {
  if (from === to) return "1";
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { rate?: number };
    if (typeof body.rate !== "number" || body.rate <= 0) return null;
    return String(body.rate);
  } catch {
    return null;
  }
}

async function migrateTeam(teamId: string, teamName: string) {
  const report = {
    teamId,
    teamName,
    agencyCurrency: "USD",
    identity: 0,
    converted: 0,
    skipped: 0,
    locked: false,
  };

  const [clients, rates, invoices, expenses, payouts, pending] = await Promise.all([
    db.select().from(agencyOpsClient).where(eq(agencyOpsClient.teamId, teamId)),
    db.select().from(agencyOpsMemberRate).where(eq(agencyOpsMemberRate.teamId, teamId)),
    db.select().from(agencyOpsInvoice).where(eq(agencyOpsInvoice.teamId, teamId)),
    db.select().from(agencyOpsExpense).where(eq(agencyOpsExpense.teamId, teamId)),
    db.select().from(agencyOpsPayoutRun).where(eq(agencyOpsPayoutRun.teamId, teamId)),
    db
      .select()
      .from(agencyOpsMoneyPendingAdjustment)
      .where(eq(agencyOpsMoneyPendingAdjustment.teamId, teamId)),
  ]);

  const currencyVotes: string[] = [];
  for (const c of clients) if (c.billableRateAmount != null) currencyVotes.push(c.currency);
  for (const r of rates) currencyVotes.push(r.currency);
  for (const i of invoices) currencyVotes.push(i.currency);
  for (const e of expenses) currencyVotes.push(e.currency);
  for (const p of payouts) currencyVotes.push(p.currency);
  for (const a of pending) currencyVotes.push(a.currency);

  const agencyCurrency = dominantCurrency(currencyVotes);
  report.agencyCurrency = agencyCurrency;

  const hasMoney =
    rates.length > 0 ||
    invoices.length > 0 ||
    expenses.length > 0 ||
    payouts.length > 0 ||
    pending.length > 0 ||
    clients.some((c) => c.billableRateAmount != null);
  report.locked = hasMoney;

  const rateCache = new Map<string, string>();
  async function rateFor(from: string, to: string): Promise<string | null> {
    const key = `${from}->${to}`;
    if (rateCache.has(key)) return rateCache.get(key)!;
    const live = await fetchFrankfurterRate(from, to);
    if (live) rateCache.set(key, live);
    return live;
  }

  async function resolveRow(sourceAmount: number, sourceCurrency: string) {
    const from = normalizeCurrencyCode(sourceCurrency);
    if (from === agencyCurrency) {
      report.identity += 1;
      return resolveLocal({
        sourceAmount,
        sourceCurrency: from,
        agencyCurrency,
        rate: "1",
      });
    }
    const live = await rateFor(from, agencyCurrency);
    if (!live) {
      report.skipped += 1;
      return null;
    }
    report.converted += 1;
    return resolveLocal({
      sourceAmount,
      sourceCurrency: from,
      agencyCurrency,
      rate: live,
    });
  }

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          ...report,
          counts: {
            clients: clients.length,
            rates: rates.length,
            invoices: invoices.length,
            expenses: expenses.length,
            payouts: payouts.length,
            pending: pending.length,
          },
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return report;
  }

  const now = new Date();
  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId,
      currency: agencyCurrency,
      currencyLockedAt: hasMoney ? now : null,
      rulesJson: { enabledRuleIds: [] },
      calcOptionsJson: { enabledOptionIds: [] },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        currency: agencyCurrency,
        currencyLockedAt: hasMoney ? now : null,
        updatedAt: now,
      },
    });

  for (const [pair, rate] of rateCache) {
    const [src, dst] = pair.split("->") as [string, string];
    if (src === dst) continue;
    await db
      .insert(agencyOpsFxRate)
      .values({
        id: createWorkspaceId("agency-fx"),
        teamId,
        fromCurrency: src,
        toCurrency: dst,
        rate,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [agencyOpsFxRate.teamId, agencyOpsFxRate.fromCurrency, agencyOpsFxRate.toCurrency],
        set: { rate, updatedAt: now },
      });
  }

  for (const client of clients) {
    if (client.billableRateAmount == null) continue;
    const resolved = await resolveRow(client.billableRateAmount, client.currency);
    if (!resolved) continue;
    await db
      .update(agencyOpsClient)
      .set({
        billableRateAmount: resolved.amount,
        sourceBillableRateAmount: resolved.sourceAmount,
        currency: resolved.sourceCurrency,
        fxRate: resolved.fxRate,
        fxAsOf: new Date(resolved.fxAsOf),
      })
      .where(eq(agencyOpsClient.id, client.id));
  }

  for (const rate of rates) {
    const costSrc = rate.sourceCostRateAmount ?? rate.costRateAmount;
    const billSrc = rate.sourceBillableRateAmount ?? rate.billableRateAmount;
    let costAmount = rate.costRateAmount;
    let billAmount = rate.billableRateAmount;
    let fxRate = "1";
    let fxAsOf = now;
    let sourceCurrency = normalizeCurrencyCode(rate.currency);

    if (costSrc != null) {
      const resolved = await resolveRow(costSrc, rate.currency);
      if (resolved) {
        costAmount = resolved.amount;
        fxRate = resolved.fxRate;
        fxAsOf = new Date(resolved.fxAsOf);
        sourceCurrency = resolved.sourceCurrency;
      }
    }
    if (billSrc != null) {
      const resolved = await resolveRow(billSrc, rate.currency);
      if (resolved) {
        billAmount = resolved.amount;
        fxRate = resolved.fxRate;
        fxAsOf = new Date(resolved.fxAsOf);
        sourceCurrency = resolved.sourceCurrency;
      }
    }

    await db
      .update(agencyOpsMemberRate)
      .set({
        costRateAmount: costAmount,
        billableRateAmount: billAmount,
        sourceCostRateAmount: costSrc,
        sourceBillableRateAmount: billSrc,
        currency: sourceCurrency,
        fxRate,
        fxAsOf,
      })
      .where(eq(agencyOpsMemberRate.id, rate.id));
  }

  for (const invoice of invoices) {
    const sourceAmount = invoice.sourceAmount ?? invoice.amount;
    const resolved = await resolveRow(sourceAmount, invoice.currency);
    if (!resolved) continue;
    const receivedRatio = invoice.amount > 0 ? invoice.receivedAmount / invoice.amount : 1;
    await db
      .update(agencyOpsInvoice)
      .set({
        amount: resolved.amount,
        receivedAmount: Math.round(resolved.amount * receivedRatio),
        sourceAmount: resolved.sourceAmount,
        currency: resolved.sourceCurrency,
        fxRate: resolved.fxRate,
        fxAsOf: new Date(resolved.fxAsOf),
      })
      .where(eq(agencyOpsInvoice.id, invoice.id));
  }

  for (const expense of expenses) {
    const sourceAmount = expense.sourceAmount ?? expense.amount;
    const resolved = await resolveRow(sourceAmount, expense.currency);
    if (!resolved) continue;
    const paidRatio = expense.amount > 0 ? expense.paidAmount / expense.amount : 1;
    await db
      .update(agencyOpsExpense)
      .set({
        amount: resolved.amount,
        paidAmount: Math.round(resolved.amount * paidRatio),
        sourceAmount: resolved.sourceAmount,
        currency: resolved.sourceCurrency,
        fxRate: resolved.fxRate,
        fxAsOf: new Date(resolved.fxAsOf),
      })
      .where(eq(agencyOpsExpense.id, expense.id));
  }

  for (const adj of pending) {
    const sourceAmount = adj.sourceAmount ?? adj.amount;
    const resolved = await resolveRow(sourceAmount, adj.currency);
    if (!resolved) continue;
    await db
      .update(agencyOpsMoneyPendingAdjustment)
      .set({
        amount: resolved.amount,
        sourceAmount: resolved.sourceAmount,
        currency: resolved.sourceCurrency,
        fxRate: resolved.fxRate,
        fxAsOf: new Date(resolved.fxAsOf),
      })
      .where(eq(agencyOpsMoneyPendingAdjustment.id, adj.id));
  }

  for (const run of payouts) {
    await db
      .update(agencyOpsPayoutRun)
      .set({ currency: agencyCurrency })
      .where(eq(agencyOpsPayoutRun.id, run.id));
  }

  console.log(JSON.stringify({ ...report, applied: true }, null, 2));
  return report;
}

async function main() {
  const teams = await db
    .select({ id: workspaceTeam.id, name: workspaceTeam.name })
    .from(workspaceTeam);
  const selected = teamIdFilter ? teams.filter((t) => t.id === teamIdFilter) : teams;

  console.log(
    apply
      ? `Applying money currency migration for ${selected.length} team(s)…`
      : `Dry-run money currency migration for ${selected.length} team(s)… (pass --apply to write)`,
  );

  for (const team of selected) {
    await migrateTeam(team.id, team.name);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
