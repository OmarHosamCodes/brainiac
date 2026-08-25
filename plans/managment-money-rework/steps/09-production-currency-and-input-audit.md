# Step 09 — Production currency migration and input audit

**Date:** 2026-08-24  
**Scope:** Railway production (`Internal Tools` → `Orch`), School Of Marketing
Money data.

## Deployment state

- Commit `b674e0c8` is the active successful Railway deployment.
- The combined `web` service starts the API and TanStack Start web process.
- Railway pre-deploy ran `drizzle-kit push`; tables, columns, indexes, and
  foreign keys for migrations 0055–0057 were verified in production.
- Both production domains returned HTTP 200.

## Production currency migration

The owner approved applying the restored-snapshot currency decision directly
to production:

- EGP-scale ledger amounts were relabeled without multiplication.
- Genuine USD client source rates stayed USD.
- Resolved client rates were converted to EGP at `1 USD = 50.94 EGP`.

The migration ran in one serializable transaction after asserting the exact
restored snapshot. It aborted automatically if any count, currency, amount, or
rate differed.

Rows changed:

```text
money settings       1
expenses             4
payout runs          6
invoices              0
pending adjustments   0
FX rates inserted     1
client rates          9
```

Post-transaction verification:

- Agency currency: EGP, still locked
- Expenses: 4 EGP rows, amounts unchanged, source amounts retained at FX 1
- Payout runs: 6 EGP rows
- Member rate: unchanged at 216/216 EGP
- FX: USD→EGP `50.94`
- Client source rates: 1,600–3,300 USD minor units
- Client resolved rates: 81,504–168,102 EGP minor units

## Read-only Fin-Sheet input audit

Selected period:

```text
2026-06-26T00:00:00.000Z
→ 2026-07-25T23:59:59.999Z
```

This is the production tenure month corresponding to the Fin-Sheet July/BF
comparison.

### Income

- Fin-Sheet: EGP 306,323.00
- Orch external non-waste tracked income: EGP 283,920.68
- Delta: **EGP -22,402.32**

The client/project audit found:

- All priced projects inherit client rates; production has no project override.
- Interface has tracked time but no client/project rate.
- Consultation → Coaching has tracked time but no rate.
- OGMs has no matching production client/activity.
- Athletic Mission and White & Bright produce Orch income but are absent from
  the Fin-Sheet July client list.
- Small deltas on Tano, Tharaa, Mesh Madrasa, DR El Nazer, and Lucent come from
  tracked duration × catalog rate versus typed Fin-Sheet estimates.

### Costs and payout facts

Production has no salary pool and no payout lines for the selected period:

| Fact | Fin-Sheet EGP | Orch EGP | Missing EGP |
| --- | ---: | ---: | ---: |
| Salaries | 240,000 | 0 | 240,000 |
| Expenses | 139,646 | 0 | 139,646 |
| Debt / discount | 20,000 | 0 | 20,000 |
| Device compensation | 24,000 | 0 | 24,000 |
| Paid vacation | 2,500 | 0 | 2,500 |
| **Total cost** | **426,146** | **0** | **426,146** |

The four existing expense records are dated 2026-08-24, so they correctly do
not contribute to the selected July tenure period. Their total is not the
Fin-Sheet July expense total.

### Rules and formulas

- Runtime merge supplies default bindings for system formulas.
- Persisted system formulas still have nullable `ruleId`, which is compatible
  with the runtime defaults.
- `TRANSPORTATION` is enabled for five members but has no custom formula amount
  or payout destination.
- Rent allowance is enabled but has no custom formula amount or payout
  destination.

## Audit notes (2026-08-25)

Documented Fin-Sheet ↔ Orch gaps for the selected July period — salary/debt/
device/vacation/expense backfill, Interface/Coaching/OGMs income, and
Rent/TRANSPORTATION formula configuration — are reference-only; they are not
part of this rework batch.
