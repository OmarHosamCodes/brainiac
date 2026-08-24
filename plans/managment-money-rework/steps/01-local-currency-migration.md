# Executed step 01: local currency migration

**Executed:** 2026-08-24  
**Scope:** restored local Postgres only  
**Production/Railway:** unchanged

## 1. Inventory the restored data

The dry run checked currency labels and row counts before any write:

- Money settings: 1 USD row, locked since 2026-08-13
- Expenses: 4 USD rows
- Payout runs: 6 USD rows
- Member rates: 1 EGP row
- Invoices: 0 rows
- Pending adjustments: 0 rows
- Client rates: 9 USD rows
- FX rates: 0 rows

The client-rate range was 1,600–3,300 minor units, or $16–$33/hour. That
disproved the original assumption that every USD label represented an
EGP-scale amount.

## 2. Choose the client-rate migration branch

The selected behavior was:

1. Keep each client rate's source currency as USD.
2. Preserve `source_billable_rate_amount`.
3. Convert only `billable_rate_amount`, which is the resolved agency-currency
   amount.
4. Record a manual USD→EGP rate of `50.94`, dated 2026-08-24.

Expenses and payout runs followed a different path because their restored
amounts were already EGP-scale: relabel them without multiplying their integer
amounts.

## 3. Validate client rows before writing

All 9 client rows had:

- `currency = USD`
- Source and resolved amounts equal at 1,600, 2,200, or 3,300
- `fx_rate = 1`

This confirmed that they had not already been converted.

## 4. Apply one transaction

The first attempt included a PL/pgSQL safety assertion that referenced psql
variables inside a dollar-quoted block. psql did not expand those variables;
Postgres aborted the transaction and rolled it back. No rows changed.

The corrected transaction used literal team scoping inside the assertion and
enabled psql fail-fast behavior. It then:

1. Asserted the expected restored row counts.
2. Changed money settings from USD to EGP, retaining the lock timestamp.
3. Relabeled 4 expenses to EGP, retaining each amount and setting source amount
   to the same value at FX rate 1.
4. Relabeled 6 payout runs to EGP.
5. Updated 0 invoices and 0 pending adjustments.
6. Inserted one USD→EGP FX row at `50.94`.
7. Updated 9 client rows:
   - source currency remained USD
   - source amounts remained 1,600–3,300
   - resolved amounts became
     `round(source_billable_rate_amount × 50.94)`
   - `fx_rate` became `50.94`
8. Committed successfully.

Postgres reported:

```text
UPDATE 1  money settings
UPDATE 4  expenses
UPDATE 6  payout runs
UPDATE 0  invoices
UPDATE 0  pending adjustments
INSERT 1  FX rate
UPDATE 9  client rates
```

## 5. Verify persisted results

Verification confirmed:

- Agency currency: EGP, still locked
- Expense amounts unchanged:
  - 230.00 EGP
  - 780.00 EGP
  - 1,780.00 EGP
  - 5,000.00 EGP
- Payout runs: 6 EGP rows
- Member rate: unchanged at 216/216 EGP
- FX: USD→EGP `50.94`
- Client source amounts: 1,600–3,300 USD minor units
- Client resolved amounts: 81,504–168,102 EGP minor units

## 6. Verify the local Money surface

The local `/agency/management/money` page was reloaded after the settings-cache
window. It displayed:

- EGP as the scoreboard currency
- EGP expense labels
- The expected 230, 780, 1,780, and 5,000 EGP expense values

Fin-Sheet July totals were not expected yet because salary, device, vacation,
and other input alignment belongs to later slices.

## Result

The restored local database now uses EGP as agency currency without corrupting
genuine USD client source rates. The reusable SQL and cautions are recorded in
[`../actions/01-relabel-agency-currency-egp.md`](../actions/01-relabel-agency-currency-egp.md).
