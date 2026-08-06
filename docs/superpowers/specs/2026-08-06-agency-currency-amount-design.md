# Agency currency + amount unification — design

**Status:** Confirmed  
**Date:** 2026-08-06  
**Surface:** Agency Management → Money (and all Agency money writes: rates, clients, invoices, payouts, expenses, adjustments)  
**Related:** Money compose-on-demand, money stats cards (“team currency later”)

---

## 1. Feature summary

Every agency team has one **agency currency** (e.g. EGP). All Money totals, scoreboards, formulas, and documents use that currency. Product language is **amount** (never “cents”). Storage remains integer **minor units** under the hood.

When an operator enters money in another currency, the write stores both the **source** amount/currency and the **resolved** agency amount, with an FX snapshot.

---

## 2. Confirmed decisions

| Decision        | Choice                                                                |
| --------------- | --------------------------------------------------------------------- |
| Dual store      | Source amount + currency, plus resolved agency amount + fx rate/as-of |
| FX rates        | Agency-owned table; optional live suggest (Frankfurter)               |
| Storage         | Integer minor units; API/UI name `amount`                             |
| Currency change | Soft-lock once any money record exists                                |
| Scope           | Agency Money only (not Polar, Canvas blocks, or `costUsd`)            |

---

## 3. Architecture

```text
UI major input + sourceCurrency
  → resolveMoneyValue(team currency, FX table)
  → persist sourceAmount + amount + fxRate + fxAsOf
  → aggregates / scoreboard / formulas sum `amount` only
```

- Agency currency on `agency_ops_money_settings.currency`.
- Soft-lock via `currency_locked_at` when money exists; reject currency updates after lock.
- Resolve on **write**; reads never re-convert.

### Resolution rules

1. Same currency → `amount = sourceAmount`, `fxRate = "1"`.
2. Else look up team FX `from → to` (or inverse `1/rate`).
3. Missing rate → reject (“Add an FX rate for USD→EGP”).
4. `amount = round(sourceAmount * fxRate)`.
5. Snapshot `fxRate` + `fxAsOf` on the row.

Live suggest: `suggestFxRate` fetches Frankfurter; does not auto-save.

---

## 4. Data model

**Money settings:** `currency`, `currency_locked_at`.

**FX table `agency_ops_fx_rate`:** `from_currency`, `to_currency`, `rate` (decimal string), unique per team pair. Meaning: `1 from = rate to`.

**Money rows:** rename `*_cents` → `*_amount` (integer minor). Add `source_amount`, `source_currency`, `fx_rate`, `fx_as_of` where values are entered. Document-level `currency` becomes source currency; agency currency is always team settings.

Formula output kind `"cents"` → `"amount"`.

---

## 5. Migration of old money

1. Dominant existing row currency → team currency (else USD).
2. Rename columns in place; values unchanged.
3. Same-currency rows: `source_* = amount`, `fx_rate = 1`.
4. Mismatched rows: convert via Frankfurter (or seeded FX) at migrate time; store snapshot.
5. Lock currency if any money rows exist.

Op: `migrate-agency-money-amounts` (dry-run report).

---

## 6. UI

- Money settings: currency Select + locked message; FX rates card (CRUD + Suggest).
- Money inputs: Amount + Currency (default agency); preview “= X EGP” when foreign.
- Formatters: `formatMoneyAmount` / `amountToMajor` (÷100 for 2-decimal currencies).
- No hardcoded `"USD"` fallbacks; use team currency.

---

## 7. Out of scope

- Polar SaaS billing
- Canvas workspace EGP toy blocks
- Conversation `usage_summary.costUsd`
- Re-resolving history after currency change

---

## 8. Testing

- Pure resolve + major↔minor helpers
- Soft-lock + FX CRUD + suggest (mocked fetch)
- Billing write paths persist dual fields
- Migration identity + foreign convert
- Conventions / types / billing unit tests
