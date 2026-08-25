# Management Money Rework — executed steps

This folder records what was actually run or changed locally. It is an
execution log, not a replacement for:

- [`../actions/`](../actions/README.md) — reusable operational runbooks
- [`../slices/`](../slices/README.md) — implementation plans
- [`../sources/`](../sources/README.md) — task knowledge base

## Completed locally

1. [`01-local-currency-migration.md`](./01-local-currency-migration.md) —
   relabeled EGP-scale ledger rows, preserved genuine USD client rates, and
   converted their resolved amounts to EGP.
2. [`02-finsheet-equations-implementation.md`](./02-finsheet-equations-implementation.md) —
   implemented and tested Fin-Sheet team profit, ROI, and profit-share
   equations.
3. [`03-client-rate-only-invoicing.md`](./03-client-rate-only-invoicing.md) —
   removed member billable rates from client activity and invoice pricing.
4. [`04-team-salary-pool.md`](./04-team-salary-pool.md) — manual Team salaries
   pool, shared member payments, Final payment, formula precedence.
5. [`05-project-rate-overrides.md`](./05-project-rate-overrides.md) — optional
   project catalog rate override with client-rate inheritance.
6. [`06-period-range-bounds.md`](./06-period-range-bounds.md) — fixed inverted
   future tenure-month bounds rejected by the Money scoreboard.
7. [`07-subscription-expense-occurrences.md`](./07-subscription-expense-occurrences.md) —
   retained paid subscription cycles in period totals and added Due/Paid list
   visibility.
8. [`08-formula-rule-binding.md`](./08-formula-rule-binding.md) — formula
   `ruleId`, payout eligibility from rules, formula editor Rule picker.
9. [`09-production-currency-and-input-audit.md`](./09-production-currency-and-input-audit.md) —
   Railway deploy verification, guarded production EGP migration, and read-only
   Fin-Sheet July input reconciliation.

**Production:** see [`../actions/02-production-deploy.md`](../actions/02-production-deploy.md).

Steps 01–08 were implemented locally before the production deploy. Step 09
records the production deployment, currency migration, and read-only input audit.
