# Action: Relabel agency currency USD → EGP

**Target:** local restored copy only (`localhost:5440/orch`), team School Of Marketing.

**Local execution:** completed 2026-08-24. Client rates were confirmed as genuine USD
source rates ($16–$33/hour), so they were converted to EGP resolved amounts using
`1 USD = 50.94 EGP` rather than relabeled.

**Do not** use Money settings Save currency. `setAgencyCurrency` throws `Currency locked after money exists` once `currency_locked_at` is set or any money row exists.

**Do not** run `apps/server/src/operations/migrate-agency-money-amounts.ts`. It votes a **dominant** currency from existing labels. This snapshot has 4 USD expenses + 6 USD payout runs vs 1 EGP member rate, so it would keep **USD** and/or FX-convert. The expense amounts (23,000 / 178,000 / 78,000 / 500,000) are already EGP-scale figures stored under a USD label.

**Rule for this snapshot:** relabel EGP-scale ledger rows without changing their
integer `amount`; preserve genuine USD client source rates and convert their
resolved agency amounts. Product language stays `amount` (minor units, ÷100 for
display).

## Why

| Row | Restored state | After this action |
| --- | --- | --- |
| `agency_ops_money_settings` | `USD`, locked 2026-08-13 | `EGP`, lock timestamp kept or refreshed |
| `agency_ops_expense` (4) | `currency = USD` | `EGP`, same amounts |
| `agency_ops_payout_run` (6) | `USD` | `EGP` |
| `agency_ops_member_rate` (1) | already `EGP` 216/216 | unchanged |
| invoices / pending | empty | unchanged |
| FX | empty | USD→EGP 50.94 |
| client billable rates (9) | USD source rates, $16–$33/hour | source stays USD; resolved agency amounts converted to EGP at 50.94 |

Team id:

```text
team-aabe75dc-1a60-4330-a92f-2ff3e0258455
```

## Preconditions

1. Local Postgres is the 2026-08-24 prod restore (see [`../sources/restored-local-db.md`](../sources/restored-local-db.md)).
2. You accept that **production is unchanged** unless you later run a separate, reviewed prod action.
3. Dev server can be restarted after SQL (in-process money settings cache, 60s TTL).

```bash
LOCAL_URL='postgresql://postgres:password@localhost:5440/orch'
TEAM='team-aabe75dc-1a60-4330-a92f-2ff3e0258455'
```

## Step 1: Dry-run inventory

```bash
psql "$LOCAL_URL" -c "SELECT currency, currency_locked_at FROM agency_ops_money_settings WHERE team_id = '$TEAM';"

psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_expense WHERE team_id = '$TEAM' GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_payout_run WHERE team_id = '$TEAM' GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_member_rate WHERE team_id = '$TEAM' GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_invoice WHERE team_id = '$TEAM' GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_money_pending_adjustment WHERE team_id = '$TEAM' GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT currency, count(*) FROM agency_ops_client WHERE team_id = '$TEAM' AND billable_rate_amount IS NOT NULL GROUP BY 1;"
psql "$LOCAL_URL" -c "SELECT count(*) FROM agency_ops_fx_rate WHERE team_id = '$TEAM';"
```

Expect: settings USD locked; expenses USD; payouts USD; member rate EGP; invoices/pending/FX empty.

## Step 2: Relabel (apply)

One transaction. EGP-scale ledger amounts are not multiplied; only resolved
client-rate amounts are converted.

```bash
psql "$LOCAL_URL" <<SQL
BEGIN;

UPDATE agency_ops_money_settings
SET currency = 'EGP',
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD';

UPDATE agency_ops_expense
SET currency = 'EGP',
    source_amount = COALESCE(source_amount, amount),
    fx_rate = '1',
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD';

UPDATE agency_ops_payout_run
SET currency = 'EGP',
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD';

UPDATE agency_ops_invoice
SET currency = 'EGP',
    source_amount = COALESCE(source_amount, amount),
    fx_rate = '1',
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD';

UPDATE agency_ops_money_pending_adjustment
SET currency = 'EGP',
    source_amount = COALESCE(source_amount, amount),
    fx_rate = '1',
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD';

-- This restored copy has genuine USD client source rates. Preserve the source
-- amount/currency and convert the agency-currency resolved amount.
INSERT INTO agency_ops_fx_rate (
  id, team_id, from_currency, to_currency, rate, created_at, updated_at
)
VALUES (
  'agency-fx-$(uuidgen)', '$TEAM', 'USD', 'EGP', '50.94', now(), now()
);

UPDATE agency_ops_client
SET source_billable_rate_amount = COALESCE(source_billable_rate_amount, billable_rate_amount),
    billable_rate_amount =
      round(COALESCE(source_billable_rate_amount, billable_rate_amount) * 50.94)::integer,
    fx_rate = '50.94',
    fx_as_of = now(),
    updated_at = now()
WHERE team_id = '$TEAM'
  AND currency = 'USD'
  AND billable_rate_amount IS NOT NULL;

COMMIT;
SQL
```

Leave `agency_ops_member_rate` alone if it is already `EGP`. If any rate row is `USD` with the same 216-style local figure, relabel that row to `EGP` the same way (no multiply).

Expenses and payout runs are EGP at rate 1. Client rate inputs remain USD source
values and have EGP resolved amounts at 50.94.

## Step 3: Verify

```bash
psql "$LOCAL_URL" -c "SELECT currency, currency_locked_at FROM agency_ops_money_settings WHERE team_id = '$TEAM';"
psql "$LOCAL_URL" -c "SELECT name, amount, currency FROM agency_ops_expense WHERE team_id = '$TEAM';"
psql "$LOCAL_URL" -c "SELECT DISTINCT currency FROM agency_ops_payout_run WHERE team_id = '$TEAM';"
psql "$LOCAL_URL" -c "SELECT billable_rate_amount, cost_rate_amount, currency FROM agency_ops_member_rate WHERE team_id = '$TEAM';"
psql "$LOCAL_URL" -c "SELECT from_currency, to_currency, rate FROM agency_ops_fx_rate WHERE team_id = '$TEAM';"
psql "$LOCAL_URL" -c "SELECT source_billable_rate_amount, currency, billable_rate_amount, fx_rate FROM agency_ops_client WHERE team_id = '$TEAM' AND billable_rate_amount IS NOT NULL;"
```

Expect settings `EGP` still locked; expense amounts unchanged; payouts `EGP`;
member rate still 216 EGP; USD client source amounts 1,600–3,300; EGP resolved
amounts 81,504–168,102; FX rate 50.94.

Restart `bun run dev` (or wait 60s) so `money-settings-cache` drops the USD snapshot.

On `/agency/management/money`: settings Currency shows **EGP**; expense cards show EGP; scoreboard currency is EGP. Totals still will not equal Fin-Sheet July until salaries/device/vacation inputs exist (slice 01 + later data slices).

## What this does not do

- Unlock currency in the product UI (lock stays; that is correct once money exists)
- Convert the 216 EGP member rate into USD or vice versa
- Relabel genuine USD client source rates as EGP
- Create salary payout lines or retype Fin-Sheet client estimates
- Touch Railway/prod

If this ever becomes a prod action: dump first, confirm relabel-not-convert with an owner, run on a clone, then a separate reviewed script — not this SQL pasted against Railway.
