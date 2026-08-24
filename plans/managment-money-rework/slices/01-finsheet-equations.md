# Slice: Fin-Sheet equations in Orch

> First shippable slice of the Management Money rework. Do not start until this slice is the one being executed.
>
> **Sources:** [`../sources/finsheet-latest-month-equations.md`](../sources/finsheet-latest-month-equations.md), [`../sources/finsheet-july-equations.canvas.tsx`](../sources/finsheet-july-equations.canvas.tsx)
>
> **Status:** completed locally on 2026-08-24. See
> [`../steps/02-finsheet-equations-implementation.md`](../steps/02-finsheet-equations-implementation.md).

**Goal:** Money scoreboard Team profit, ROI, and Profit/loss share use the same algebra as Fin-Sheet column BF (July).

**Out of scope:** Matching July’s typed amounts (306,323 income, 240,000 salaries, …). That is a later data/currency slice. This slice only makes the **equations** correct for whatever facts already sit on the scoreboard. Do not add a BF91 (share ÷ salaries) metric; product Team profit stays the **amount** (BF92). Do not hardcode Fin-Sheet in `buildPeriodScoreboard`.

**Architecture:** Keep chip formulas as the source of truth. Fix the period formula **context** and **eval order** so `team_profit` includes device compensation and share runs after profit. Update locked system **templates** (and tests) so new teams get Fin-Sheet tokens; existing teams pick them up via `mergeMoneyFormulas` defaults only where stored tokens are still the old templates — stored custom tokens win, so also update merge so system keys `team_profit`, `roi`, and `profit_loss_share` are replaced by the new templates **unless** we decide to preserve owner edits. **Decision for this slice:** overwrite those three system keys to the Fin-Sheet tokens (owners can still edit chips afterward). Leave remaining / paid vacation / device / charity / pbc templates unchanged.

**Tech stack:** existing `money-formula-eval` (no `eval`), `money-formula-templates`, `money-formula-context`, Bun tests.

## Fin-Sheet algebra (locked)

```text
cost        = salaries + expenses + debt_discount + device_comp + paid_vacation
BF82 income = sum of period client income          → total_income
BF92 profit = income − cost                        → team_profit
BF90 ROI    = profit / cost                        → roi (ratio)
BF93 share  = (profit − charity) / 2               → profit_loss_share
BF91        = share / salaries                     → not this slice
```

July check (sheet units, not Orch minor units): income 306,323; cost 426,146; profit −119,823; ROI −28.12%; share −59,911.5.

## Files

- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-templates.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-context.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-eval.test.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/period-scoreboard.ts` only if fallback `teamProfitAmount` / `roi` still omit device — keep fallback in lockstep with context
- Modify: `packages/api/src/routers/agency-ops/billing/period-scoreboard.test.ts` if fallback changes

Do not touch web views in this slice. Stats cards already bind `team-profit`, `roi`, `profit-loss-share`.

---

### Task 1: Context `team_profit` includes device

**Files:**
- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-context.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/period-scoreboard.ts`

**Produces:** `context.team_profit` and fallback `teamProfitAmount` = income − (salaries + expenses + debt + vacation + **device**).

- [x] **Step 1: Failing test**

In `money-formula-eval.test.ts` (or the existing scoreboard apply test), add a case: device 24_000, other costs matching July scaled to integer minor units if the file already uses cents. Prefer the July numbers as plain integers (same as the sheet) so the assert is obvious:

```ts
expect(buildMoneyFormulaContext({
  totalIncomeAmount: 306_323,
  receivedAmount: 0,
  salariesAmount: 240_000,
  expensesAmount: 139_646,
  debtDiscountAmount: 20_000,
  paidVacationAmount: 2_500,
  deviceCompAmount: 24_000,
  charityAmount: 0,
  pbcAmount: 0,
  teamLossAmount: 0,
  paidVacationHours: 200,
}).team_profit).toBe(-119_823);
```

- [x] **Step 2: Run it — expect FAIL** (current context omitted device → −95,823)

- [x] **Step 3: Implementation**

In `buildMoneyFormulaContext`:

```ts
const teamProfit =
  facts.totalIncomeAmount -
  (facts.salariesAmount +
    facts.expensesAmount +
    facts.debtDiscountAmount +
    facts.paidVacationAmount +
    facts.deviceCompAmount);
```

Same five addends in `buildPeriodScoreboard` fallback `teamProfitAmount`. Fallback `roi` stays **profit / income** until Task 3 templates land; or set fallback ROI to profit/cost in the same commit so no code path still divides by income. **This slice: fallback ROI = cost === 0 ? 0 : teamProfit / cost.**

- [x] **Step 4: Tests pass**

- [x] **Step 5: Implementation recorded** in executed step 02 (changes remain
  uncommitted as part of the wider local worktree)

---

### Task 2: Eval order — profit, then share, then ROI

**Files:**
- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-context.ts` (`applyFormulasToScoreboard`)

**Produces:** `profit-loss-share` sees the formula `team_profit`, not the pre-formula `team_loss` section total.

Current order: remaining → vacation → device → charity → pbc → **share** → rebuild context → **team profit** → **roi**.

Required order after the fact chips (vacation/device/charity/pbc):

1. rebuild context (device/charity now in facts)
2. **team-profit**
3. put `board.teamProfitAmount` into `context.team_profit`
4. **profit-loss-share**
5. **roi**

- [x] **Step 1: Failing test** — formulas: team profit = income − cost (with device); share = `(team_profit − charity) / 2`; ROI = `team_profit / cost`.

- [x] **Step 2: Reorder `applyFormulasToScoreboard` as above**

- [x] **Step 3: Tests pass**

- [x] **Step 4: Implementation recorded** in executed step 02

---

### Task 3: System formula templates = Fin-Sheet tokens

**Files:**
- Modify: `packages/api/src/routers/agency-ops/billing/money-formula-templates.ts`

**Produces:** Default chips for `sys_team_profit`, `sys_roi`, `sys_profit_loss_share`.

Use the existing `v` / `op` / `paren` helpers.

**Team profit**

```ts
tokens(
  v("total_income"),
  op("-"),
  paren("("),
  v("salaries"),
  op("+"),
  v("expenses"),
  op("+"),
  v("debt_discount"),
  op("+"),
  v("device_comp"),
  op("+"),
  v("paid_vacation"),
  paren(")"),
)
```

**ROI** (`output: "ratio"`)

```ts
tokens(
  v("team_profit"),
  op("/"),
  paren("("),
  v("salaries"),
  op("+"),
  v("expenses"),
  op("+"),
  v("debt_discount"),
  op("+"),
  v("device_comp"),
  op("+"),
  v("paid_vacation"),
  paren(")"),
)
```

**Profit / loss share**

```ts
tokens(
  paren("("),
  v("team_profit"),
  op("-"),
  v("charity"),
  paren(")"),
  op("/"),
  n(2),
)
```

`mergeMoneyFormulas`: for keys `team_profit`, `roi`, `profit_loss_share`, always take **template tokens** from this slice (still honor stored `enabled`). Comment why: Fin-Sheet lockstep; owners can re-edit chips after deploy.

- [x] **Step 1: Update templates + merge + tests** (July via `applyFormulasToScoreboard` with empty stored formulas / defaults)

- [x] **Step 2: `bun test packages/api/src/routers/agency-ops/billing/money-formula-eval.test.ts packages/api/src/routers/agency-ops/billing/period-scoreboard.test.ts`**

- [x] **Step 3: Implementation recorded** in executed step 02

---

## Verify on the Money surface (after tests)

1. Restart `bun run dev` against the restored local DB.
2. Open `/agency/management/money` as an owner, period = a month that has **some** salaries/expenses/device in payouts or formulas.
3. Confirm stats: Team profit subtracts device; ROI is profit/cost not profit/income; Profit share is half of (profit − charity).
4. Restored July-like numbers will **not** appear until a later slice fills rates, salary lines, and currency. That is expected.

## Follow-up inputs

- Income source: typed client estimates vs hours × rate (BF82 inputs)
- Populate salaries / expenses / device / vacation in agency currency
- Optional BF91 metric (share ÷ salaries)
- Received / remaining when Fin-Sheet those rows are empty

Input-source auditing is now tracked by
[`02-money-input-reconciliation.md`](./02-money-input-reconciliation.md).
