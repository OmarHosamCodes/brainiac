# Expense Edit and Variable Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owners edit existing expenses from the Money Expenses panel, and let a subscription keep its cadence while taking a different amount each cycle.

**Architecture:** Persist `amountMode` (`fixed` | `variable`) on `agency_ops_expense`. Fixed subscriptions keep today's remaining/partial Pay path. Variable subscriptions store template `amount = 0`, stay in the Subscriptions list, and take this cycle's amount at Pay; that amount is snapshotted on `agency_ops_expense_occurrence` and then next due advances. Reuse the existing Add expense dialog as create/edit. Do not rewrite paid occurrences.

**Tech Stack:** Bun test, TypeScript, Drizzle ORM, oRPC/Zod, React 19, TanStack Query, shadcn Dialog/Select.

## Global Constraints

- Product word is always **amount**. Integer minor units in storage/API. Never say "cents" in UI or API.
- Views stay presentational: typed props only, no hooks, stores, or oRPC.
- Containers still call exactly one hook. Orchestration stays in `use-agency-money-surface.ts` and `useAgencyOpsStore`.
- Paid subscription occurrences stay immutable. Edit changes the template (name, note, cadence, amount mode, future amount), never a paid cycle snapshot.
- Variable unpaid due contributes `0` to the Expenses scoreboard until Pay. Paid variable cycles use the occurrence amount.
- Variable Pay is this cycle's full amount in one action. No remaining/partial path for variable. Fixed subscriptions keep remaining/partial.
- Kind cannot change on edit (one-time stays one-time; subscription stays subscription).
- Switching a subscription to variable requires the current cycle `paidAmount === 0`.
- Existing rows default to `fixed`. Adobe-style subscriptions are unchanged.
- shadcn theme tokens only. Reuse the incumbent Expenses dialog chrome. No new visual world.
- Do not create commits unless the user explicitly requests them.

---

## File map

| File | Responsibility |
|---|---|
| `packages/db/src/schema/agency-ops.ts` | `amountMode` column on `agency_ops_expense` |
| `packages/db/src/migrations/0059_agency_expense_amount_mode.sql` | Add column, default `fixed` |
| `packages/db/src/migrations/meta/_journal.json` | Journal entry `idx` 57 / tag `0059_agency_expense_amount_mode` |
| `packages/api/src/routers/agency-ops/billing/expense-helpers.ts` | Cycle `amountMode`, `planExpensePayment` |
| `packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts` | Payment plan and variable cycle tests |
| `packages/api/src/routers/agency-ops/billing/expense-service.ts` | Create/update/pay honor `amountMode` |
| `packages/api/src/routers/agency-ops/billing/router.ts` | Wire `amountMode`; allow `amount: 0` for variable |
| `apps/web/src/features/billing/money-expense-form.ts` | Amount-mode options, submit/payment helpers, amount label |
| `apps/web/src/features/billing/money-expense-form.test.ts` | Form-helper tests |
| `apps/web/src/features/shared/stores/agency-ops.ts` | `updateExpense`; create payload includes `amountMode` |
| `apps/web/src/features/money/hooks/use-agency-money-surface.ts` | Editor + variable Pay view model |
| `apps/web/src/features/money/agency-money-expenses-section-view.tsx` | Edit affordance, amount-mode field, variable Pay copy |
| `plans/managment-money-rework/sources/product-constraints.md` | Variable subscription rule |
| `docs/golden-file-source-inventory.md` | Inventory row for `0059_agency_expense_amount_mode.sql` |

## Locked product behavior

1. **Edit.** Clicking the expense **name** opens the same dialog used for Add, in edit mode. Pay stays a separate link. Paid rows still open the template editor; they do not become payable.
2. **Amount type.** Shown only when Type is Subscription. Options: `Fixed` (default) and `Variable`. Helper under Variable: "Enter this cycle's amount when you Pay."
3. **Variable create.** Period and optional start date stay required/optional as today. Amount field is hidden. Stored template amount is `0`.
4. **Variable list.** Unpaid due shows amount label `Variable`, not `EGP 0`. Meta stays `Monthly · Next 24 Aug 2026`. Pay still shows.
5. **Variable Pay.** Dialog hero is "This cycle", not Remaining. Amount starts empty. Submit records that amount as both occurrence amount and paid amount, then advances next due and hides the row until the next cycle.
6. **Scoreboard.** Unpaid variable due adds `0`. After Pay, the occurrence amount is in that period's Expenses total, same as today's paid-occurrence rule.
7. **One-time expenses** are editable (name, amount, note). Amount type is not shown.

---

### Task 1: Form helpers for amount mode and variable submit

**Files:**

- Modify: `apps/web/src/features/billing/money-expense-form.ts`
- Modify: `apps/web/src/features/billing/money-expense-form.test.ts`

**Interfaces:**

- Consumes: existing `MoneyExpenseKind`, `parseMoneyExpenseAmount`
- Produces:

```ts
export type MoneyExpenseAmountMode = "fixed" | "variable";

export const MONEY_EXPENSE_AMOUNT_MODE_OPTIONS: ReadonlyArray<{
  id: MoneyExpenseAmountMode;
  label: string;
}>;

export function moneyExpenseCanSubmit(
  name: string,
  kind: MoneyExpenseKind,
  period: MoneyExpensePeriod | null,
  amount: string,
  amountMode?: MoneyExpenseAmountMode,
): boolean;

export function moneyExpenseAmountLabel(input: {
  amountMode: MoneyExpenseAmountMode;
  amount: number;
  currency: string;
}): string;

export function moneyExpensePaymentCanSubmit(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): boolean;

export function parseMoneyExpensePaymentAmount(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): number | null;
```

- [ ] **Step 1: Write failing form-helper tests**

Append to `money-expense-form.test.ts`:

```ts
import {
  moneyExpenseAmountLabel,
  moneyExpenseCanSubmit,
  moneyExpensePaymentCanSubmit,
  parseMoneyExpensePaymentAmount,
} from "./money-expense-form";

describe("moneyExpenseCanSubmit", () => {
  test("variable subscription needs name and period, not amount", () => {
    expect(moneyExpenseCanSubmit("Electricity", "subscription", "monthly", "", "variable")).toBe(
      true,
    );
    expect(moneyExpenseCanSubmit("Electricity", "subscription", null, "", "variable")).toBe(false);
    expect(moneyExpenseCanSubmit("Rent", "one_time", null, "", "variable")).toBe(false);
  });

  test("fixed subscription still needs amount", () => {
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly", "", "fixed")).toBe(false);
    expect(moneyExpenseCanSubmit("Notion", "subscription", "monthly", "20", "fixed")).toBe(true);
  });
});

describe("moneyExpenseAmountLabel", () => {
  test("variable unpaid shows Variable, paid snapshot shows amount", () => {
    expect(
      moneyExpenseAmountLabel({ amountMode: "variable", amount: 0, currency: "EGP" }),
    ).toBe("Variable");
    expect(
      moneyExpenseAmountLabel({ amountMode: "variable", amount: 178_000, currency: "EGP" }),
    ).toBe(formatMoneyExpenseAmount(178_000, "EGP"));
    expect(
      moneyExpenseAmountLabel({ amountMode: "fixed", amount: 0, currency: "EGP" }),
    ).toBe(formatMoneyExpenseAmount(0, "EGP"));
  });
});

describe("parseMoneyExpensePaymentAmount", () => {
  test("variable ignores remaining and requires a positive amount", () => {
    expect(parseMoneyExpensePaymentAmount("1240", 0, "variable")).toBe(124_000);
    expect(parseMoneyExpensePaymentAmount("", 0, "variable")).toBeNull();
    expect(parseMoneyExpensePaymentAmount("0", 0, "variable")).toBeNull();
  });

  test("fixed still rejects more than remaining", () => {
    expect(parseMoneyExpensePaymentAmount("20", 10_000, "fixed")).toBe(2000);
    expect(parseMoneyExpensePaymentAmount("200", 10_000, "fixed")).toBeNull();
  });
});
```

Also import `formatMoneyExpenseAmount` in that test file.

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
bun test apps/web/src/features/billing/money-expense-form.test.ts
```

Expected: FAIL because `amountMode` is not a `moneyExpenseCanSubmit` argument and the new helpers are missing.

- [ ] **Step 3: Implement the helpers**

In `money-expense-form.ts`, add the type after `MoneyExpenseStatus`:

```ts
export type MoneyExpenseAmountMode = "fixed" | "variable";
```

Add `amountMode: MoneyExpenseAmountMode` to `MoneyExpenseRecord` (default callers will set `"fixed"` until Task 4).

Add options after `MONEY_EXPENSE_PERIOD_OPTIONS`:

```ts
export const MONEY_EXPENSE_AMOUNT_MODE_OPTIONS: ReadonlyArray<{
  id: MoneyExpenseAmountMode;
  label: string;
}> = [
  { id: "fixed", label: "Fixed" },
  { id: "variable", label: "Variable" },
];
```

Replace `moneyExpenseCanSubmit` with:

```ts
export function moneyExpenseCanSubmit(
  name: string,
  kind: MoneyExpenseKind,
  period: MoneyExpensePeriod | null,
  amount: string,
  amountMode: MoneyExpenseAmountMode = "fixed",
): boolean {
  if (!name.trim()) return false;
  if (kind === "subscription" && period === null) return false;
  if (kind === "subscription" && amountMode === "variable") return true;
  return parseMoneyExpenseAmount(amount) !== null;
}
```

Add:

```ts
export function moneyExpenseAmountLabel(input: {
  amountMode: MoneyExpenseAmountMode;
  amount: number;
  currency: string;
}): string {
  if (input.amountMode === "variable" && input.amount <= 0) return "Variable";
  return formatMoneyExpenseAmount(input.amount, input.currency);
}

export function parseMoneyExpensePaymentAmount(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): number | null {
  if (amountMode === "variable") return parseMoneyExpenseAmount(value);
  const parsed = parseMoneyExpenseAmount(value);
  if (parsed === null || parsed > remainingAmount) return null;
  return parsed;
}

export function moneyExpensePaymentCanSubmit(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): boolean {
  return parseMoneyExpensePaymentAmount(value, remainingAmount, amountMode) !== null;
}
```

Keep the existing `parseMoneyExpenseAmount` (`0` still invalid). Variable create does not send a parsed amount.

- [ ] **Step 4: Re-run tests and confirm pass**

Run:

```bash
bun test apps/web/src/features/billing/money-expense-form.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit only if the user asked**

If requested:

```bash
git add apps/web/src/features/billing/money-expense-form.ts apps/web/src/features/billing/money-expense-form.test.ts
git commit -m "feat(web): allow variable subscription expense drafts"
```

---

### Task 2: Payment plan helper and variable cycle rows

**Files:**

- Modify: `packages/api/src/routers/agency-ops/billing/expense-helpers.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts`

**Interfaces:**

- Consumes: `AgencyOpsExpenseKind`, `AgencyOpsExpensePeriod`, `expenseRemainingAmount`, `expenseStatusAfterPaid`, `advanceExpenseNextDueAt`
- Produces:

```ts
export type AgencyOpsExpenseAmountMode = "fixed" | "variable";

export type ExpensePaymentPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      occurrenceAmount: number;
      occurrencePaidAmount: number;
      templatePaidAmount: number;
      templateStatus: AgencyOpsExpenseStatus;
      nextDueAt: Date | null;
      writeOccurrence: boolean;
    };

export function planExpensePayment(input: {
  kind: AgencyOpsExpenseKind;
  amountMode: AgencyOpsExpenseAmountMode;
  period: AgencyOpsExpensePeriod | null;
  templateAmount: number;
  paidAmount: number;
  paymentAmount: number;
  nextDueAt: Date | null;
  startsAt: Date | null;
  now: Date;
}): ExpensePaymentPlan;
```

`SubscriptionTemplateRow` and `AgencySubscriptionCycleRecord` gain `amountMode: AgencyOpsExpenseAmountMode`.

- [ ] **Step 1: Write failing helper tests**

Add to `expense-helpers.test.ts`:

```ts
import { planExpensePayment, buildSubscriptionCycleRecords } from "./expense-helpers";

describe("planExpensePayment", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");
  const due = new Date("2026-08-24T00:00:00.000Z");

  test("fixed subscription rejects payment over remaining", () => {
    expect(
      planExpensePayment({
        kind: "subscription",
        amountMode: "fixed",
        period: "monthly",
        templateAmount: 178_000,
        paidAmount: 0,
        paymentAmount: 200_000,
        nextDueAt: due,
        startsAt: null,
        now,
      }),
    ).toEqual({ ok: false, error: "Payment exceeds remaining balance." });
  });

  test("fixed subscription full pay snapshots template amount and advances due", () => {
    const plan = planExpensePayment({
      kind: "subscription",
      amountMode: "fixed",
      period: "monthly",
      templateAmount: 178_000,
      paidAmount: 0,
      paymentAmount: 178_000,
      nextDueAt: due,
      startsAt: null,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      occurrenceAmount: 178_000,
      occurrencePaidAmount: 178_000,
      templatePaidAmount: 0,
      templateStatus: "due",
      writeOccurrence: true,
    });
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.nextDueAt?.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  test("variable subscription uses payment as cycle amount and always completes", () => {
    const plan = planExpensePayment({
      kind: "subscription",
      amountMode: "variable",
      period: "monthly",
      templateAmount: 0,
      paidAmount: 0,
      paymentAmount: 124_000,
      nextDueAt: due,
      startsAt: null,
      now,
    });
    expect(plan).toMatchObject({
      ok: true,
      occurrenceAmount: 124_000,
      occurrencePaidAmount: 124_000,
      templatePaidAmount: 0,
      templateStatus: "due",
      writeOccurrence: true,
    });
    if (!plan.ok) throw new Error("expected ok");
    expect(plan.nextDueAt?.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  test("variable subscription rejects non-positive payment", () => {
    expect(
      planExpensePayment({
        kind: "subscription",
        amountMode: "variable",
        period: "monthly",
        templateAmount: 0,
        paidAmount: 0,
        paymentAmount: 0,
        nextDueAt: due,
        startsAt: null,
        now,
      }).ok,
    ).toBe(false);
  });
});

describe("buildSubscriptionCycleRecords", () => {
  test("variable due cycle keeps amount 0 and stays payable", () => {
    const records = buildSubscriptionCycleRecords({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
      subscriptions: [
        {
          id: "expense-var",
          name: "Electricity",
          note: "",
          amount: 0,
          paidAmount: 0,
          currency: "EGP",
          period: "monthly",
          amountMode: "variable",
          nextDueAt: new Date("2026-08-24T00:00:00.000Z"),
        },
      ],
      occurrences: [],
    });
    expect(records).toEqual([
      {
        id: "due:expense-var:2026-08-24T00:00:00.000Z",
        expenseId: "expense-var",
        state: "due",
        name: "Electricity",
        note: "",
        amount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        currency: "EGP",
        period: "monthly",
        amountMode: "variable",
        dueAt: "2026-08-24T00:00:00.000Z",
        canRecordPayment: true,
      },
    ]);
  });
});
```

Update the existing `buildSubscriptionCycleRecords` fixture in this file: every subscription and expected cycle must include `amountMode: "fixed"`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
```

Expected: FAIL because `planExpensePayment` is not exported and `amountMode` is missing on cycle types.

- [ ] **Step 3: Implement the helpers**

At the top of `expense-helpers.ts`, add:

```ts
export type AgencyOpsExpenseAmountMode = "fixed" | "variable";
```

Add `amountMode: AgencyOpsExpenseAmountMode` to `SubscriptionTemplateRow` and `AgencySubscriptionCycleRecord`. Paid occurrence rows do not need a mode column; when composing paid cycles, set `amountMode: "fixed"` unless the joined template mode is available. Pass template mode through `PaidSubscriptionOccurrenceRow` as `amountMode` so paid variable cycles still label correctly after Pay (occurrence amount > 0, mode `variable`).

In `buildSubscriptionCycleRecords`, copy `row.amountMode` onto both due and paid records.

Add:

```ts
export type ExpensePaymentPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      occurrenceAmount: number;
      occurrencePaidAmount: number;
      templatePaidAmount: number;
      templateStatus: AgencyOpsExpenseStatus;
      nextDueAt: Date | null;
      writeOccurrence: boolean;
    };

export function planExpensePayment(input: {
  kind: AgencyOpsExpenseKind;
  amountMode: AgencyOpsExpenseAmountMode;
  period: AgencyOpsExpensePeriod | null;
  templateAmount: number;
  paidAmount: number;
  paymentAmount: number;
  nextDueAt: Date | null;
  startsAt: Date | null;
  now: Date;
}): ExpensePaymentPlan {
  if (!Number.isInteger(input.paymentAmount) || input.paymentAmount <= 0) {
    return { ok: false, error: "Payment amount must be a positive integer." };
  }

  if (input.kind === "subscription" && input.amountMode === "variable") {
    if (!input.period) {
      return { ok: false, error: "Subscription expenses require a period." };
    }
    const occurrenceDueAt = input.nextDueAt ?? input.startsAt ?? input.now;
    return {
      ok: true,
      occurrenceAmount: input.paymentAmount,
      occurrencePaidAmount: input.paymentAmount,
      templatePaidAmount: 0,
      templateStatus: "due",
      nextDueAt: advanceExpenseNextDueAt(occurrenceDueAt, input.period),
      writeOccurrence: true,
    };
  }

  const remaining = expenseRemainingAmount(input.templateAmount, input.paidAmount);
  if (input.paymentAmount > remaining) {
    return { ok: false, error: "Payment exceeds remaining balance." };
  }

  const paidAmount = input.paidAmount + input.paymentAmount;
  const status = expenseStatusAfterPaid(input.templateAmount, paidAmount);
  const occurrenceDueAt =
    input.kind === "subscription" ? (input.nextDueAt ?? input.startsAt ?? input.now) : null;

  if (input.kind === "subscription" && status === "paid" && input.period && occurrenceDueAt) {
    return {
      ok: true,
      occurrenceAmount: input.templateAmount,
      occurrencePaidAmount: paidAmount,
      templatePaidAmount: 0,
      templateStatus: "due",
      nextDueAt: advanceExpenseNextDueAt(occurrenceDueAt, input.period),
      writeOccurrence: true,
    };
  }

  return {
    ok: true,
    occurrenceAmount: input.templateAmount,
    occurrencePaidAmount: paidAmount,
    templatePaidAmount: paidAmount,
    templateStatus: status,
    nextDueAt: input.nextDueAt,
    writeOccurrence: occurrenceDueAt !== null,
  };
}
```

Leave `expensePeriodTotals` unchanged. Variable unpaid due already contributes `0` because template `amount` is `0`. Paid occurrences still add `occurrence.amount`.

- [ ] **Step 4: Re-run tests and confirm pass**

Run:

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
```

Expected: PASS, including the existing paid-occurrence total tests.

- [ ] **Step 5: Commit only if the user asked**

```bash
git add packages/api/src/routers/agency-ops/billing/expense-helpers.ts packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
git commit -m "feat(api): plan variable subscription expense payments"
```

---

### Task 3: Persist amountMode

**Files:**

- Modify: `packages/db/src/schema/agency-ops.ts`
- Create: `packages/db/src/migrations/0059_agency_expense_amount_mode.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`

**Interfaces:**

- Consumes: existing `agencyOpsExpense` table
- Produces: `AgencyOpsExpenseAmountMode` and `amountMode` column, default `"fixed"`

- [ ] **Step 1: Add the Drizzle column**

In `packages/db/src/schema/agency-ops.ts`, next to `AgencyOpsExpenseKind`:

```ts
export type AgencyOpsExpenseAmountMode = "fixed" | "variable";
```

On `agencyOpsExpense`, immediately after `amount`:

```ts
amount: integer("amount").notNull().default(0),
amountMode: text("amount_mode").$type<AgencyOpsExpenseAmountMode>().notNull().default("fixed"),
```

- [ ] **Step 2: Add the SQL migration**

Create `packages/db/src/migrations/0059_agency_expense_amount_mode.sql`:

```sql
ALTER TABLE "agency_ops_expense" ADD COLUMN IF NOT EXISTS "amount_mode" text DEFAULT 'fixed' NOT NULL;
```

- [ ] **Step 3: Journal the migration**

Append to `packages/db/src/migrations/meta/_journal.json` `entries`:

```json
{
  "idx": 57,
  "version": "7",
  "when": 1787900000034,
  "tag": "0059_agency_expense_amount_mode",
  "breakpoints": true
}
```

Do not generate a new snapshot JSON. Later money migrations (`0057`, `0058`) are SQL + journal only.

- [ ] **Step 4: Apply locally**

Run:

```bash
bun run db:push
```

Expected: `agency_ops_expense.amount_mode` exists; existing rows are `fixed`.

If `db:push` is not the local path, run the migration the repo already uses for handwritten SQL. Confirm with:

```sql
SELECT amount_mode, count(*) FROM agency_ops_expense GROUP BY amount_mode;
```

Expected: only `fixed`, or empty table.

- [ ] **Step 5: Commit only if the user asked**

```bash
git add packages/db/src/schema/agency-ops.ts packages/db/src/migrations/0059_agency_expense_amount_mode.sql packages/db/src/migrations/meta/_journal.json
git commit -m "feat(db): add expense amount mode for variable subscriptions"
```

---

### Task 4: Service and router honor amountMode

**Files:**

- Modify: `packages/api/src/routers/agency-ops/billing/expense-service.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/router.ts`

**Interfaces:**

- Consumes: `planExpensePayment`, schema `amountMode`
- Produces: `AgencyExpenseRecord.amountMode`; `create`/`update` accept `amountMode`; `create.amount` is `nonnegative` so variable can send `0`

- [ ] **Step 1: Extend the mapped record**

In `expense-service.ts`, import `planExpensePayment` and `AgencyOpsExpenseAmountMode` from `./expense-helpers` (or from `@orch/db/schema` for the DB type; use the schema type for the column and the helper type for the plan). Add to `AgencyExpenseRecord`:

```ts
amountMode: AgencyOpsExpenseAmountMode;
```

In `mapExpenseRow`:

```ts
amountMode: row.amountMode ?? "fixed",
remainingAmount: expenseRemainingAmount(row.amount, paidAmount),
```

For variable rows, `remainingAmount` is `0`. That is correct: Pay does not use remaining.

- [ ] **Step 2: Create stores amount 0 for variable**

Replace the amount guard in `createExpense` with:

```ts
const amountMode: AgencyOpsExpenseAmountMode =
  input.kind === "subscription" ? (input.amountMode ?? "fixed") : "fixed";
if (amountMode === "variable") {
  if (input.kind !== "subscription") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Variable amount is only valid for subscriptions.",
    });
  }
} else if (!Number.isInteger(input.amount) || input.amount <= 0) {
  throw new ORPCError("BAD_REQUEST", {
    message: "Amount must be a positive integer (minor units).",
  });
}
```

When resolving money for variable, pass `0` into `moneyCtx.resolve` (agency currency still locks). Insert `amountMode` on the row. Variable `amount` column is `0`.

- [ ] **Step 3: Update validates mode switches**

In `updateExpense`:

```ts
const amountMode: AgencyOpsExpenseAmountMode =
  existing.kind === "subscription"
    ? (input.amountMode ?? existing.amountMode ?? "fixed")
    : "fixed";

if (amountMode === "variable" && (existing.paidAmount ?? 0) > 0) {
  throw new ORPCError("BAD_REQUEST", {
    message: "Finish the current cycle before switching to variable amount.",
  });
}
```

Amount rules:

- `amountMode === "variable"`: set stored amount to `0`; skip the positive-amount check.
- `amountMode === "fixed"`: keep today's positive integer check (`input.amount ?? existing.amount` must be `> 0`).

Write `amountMode` in the `.set({ ... })` payload.

- [ ] **Step 4: Replace inline pay math with planExpensePayment**

In `recordExpensePayment`, after loading `existing` and the already-paid guard:

```ts
const plan = planExpensePayment({
  kind: existing.kind,
  amountMode: existing.amountMode ?? "fixed",
  period: existing.period ?? null,
  templateAmount: existing.amount,
  paidAmount: existing.paidAmount ?? 0,
  paymentAmount: input.amount,
  nextDueAt: existing.nextDueAt,
  startsAt: existing.startsAt,
  now: new Date(),
});
if (!plan.ok) {
  throw new ORPCError("BAD_REQUEST", { message: plan.error });
}
```

Use `plan.writeOccurrence`, `plan.occurrenceAmount`, `plan.occurrencePaidAmount` in the occurrence upsert (`amount: plan.occurrenceAmount`, `paidAmount: plan.occurrencePaidAmount`). Update the template with `paidAmount: plan.templatePaidAmount`, `status: plan.templateStatus`, `nextDueAt: plan.nextDueAt`. Remove the duplicated remaining/advance block.

Keep the occurrence due date as `existing.nextDueAt ?? existing.startsAt ?? new Date()` when `writeOccurrence` is true.

- [ ] **Step 5: Select amountMode in listSubscriptionCycles**

Add `amountMode: agencyOpsExpense.amountMode` to both the subscription template select and the occurrence join select. Pass it into `buildSubscriptionCycleRecords`.

- [ ] **Step 6: Router schemas**

In `router.ts`:

```ts
const expenseAmountModeSchema = z.enum(["fixed", "variable"]);
```

Add `amountMode: expenseAmountModeSchema` to `expenseRecordSchema` and `subscriptionCycleRecordSchema`.

`expenses.create` input:

```ts
amount: z.number().int().nonnegative(),
amountMode: expenseAmountModeSchema.optional(),
```

`expenses.update` input:

```ts
amount: z.number().int().nonnegative().optional(),
amountMode: expenseAmountModeSchema.optional(),
```

Service still rejects fixed `0`.

- [ ] **Step 7: Typecheck the API package**

Run:

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
bun run check-types --filter=@orch/api
```

If the filter name differs, run `bun run check-types` and confirm `expense-service.ts` / `router.ts` have no errors.

Expected: PASS.

- [ ] **Step 8: Commit only if the user asked**

```bash
git add packages/api/src/routers/agency-ops/billing/expense-service.ts packages/api/src/routers/agency-ops/billing/router.ts
git commit -m "feat(api): create and pay variable subscription expenses"
```

---

### Task 5: Store updateExpense and create amountMode

**Files:**

- Modify: `apps/web/src/features/shared/stores/agency-ops.ts`

**Interfaces:**

- Consumes: `orpcClient.agencyOps.expenses.update` (already on the router)
- Produces: `updateExpense(payload, callbacks)` and `CreateExpensePayload.amountMode`

- [ ] **Step 1: Extend the create payload**

```ts
type CreateExpensePayload = {
  teamId: string;
  name: string;
  kind: "one_time" | "subscription";
  period?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  note?: string;
  amount: number;
  amountMode?: "fixed" | "variable";
  currency?: string;
  startsAt?: string | null;
};

type UpdateExpensePayload = {
  teamId: string;
  expenseId: string;
  name?: string;
  note?: string;
  amount?: number;
  amountMode?: "fixed" | "variable";
  period?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  startsAt?: string | null;
};
```

Pass `amountMode` through `createExpense`'s `orpcClient.agencyOps.expenses.create` call. For variable, send `amount: 0`.

- [ ] **Step 2: Add updateExpense next to createExpense**

Copy `createExpense`'s pending-flag / invalidate / toast pattern:

```ts
async function updateExpense(
  payload: UpdateExpensePayload,
  callbacks?: { onSuccess?: () => void },
) {
  if (!payload.teamId || !payload.expenseId) return;

  set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

  try {
    await orpcClient.agencyOps.expenses.update(payload);
    await Promise.all([
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.expenses.list.key(),
      }),
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.expenses.subscriptionCycles.key(),
      }),
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.money.periodScoreboard.key(),
      }),
    ]);
    callbacks?.onSuccess?.();
    toast.success("Expense updated");
  } catch (error) {
    toast.error("Couldn't update expense", {
      description: getErrorMessage(error, "Try again."),
    });
  } finally {
    set((state) => ({
      ...state,
      invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
    }));
  }
}
```

Export `updateExpense` from the store object next to `createExpense`.

- [ ] **Step 3: Confirm the store still typechecks**

Run:

```bash
bun run check-types --filter=web
```

Expected: PASS once the oRPC client sees `amountMode` from Task 4.

- [ ] **Step 4: Commit only if the user asked**

```bash
git add apps/web/src/features/shared/stores/agency-ops.ts
git commit -m "feat(web): wire expense update and variable create payloads"
```

---

### Task 6: Expenses editor and variable Pay UI

**Files:**

- Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts`
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`

**Interfaces:**

- Consumes: Task 1 helpers, Task 5 store
- Produces: view-model fields below; view remains props-only

`expenses.create` gains:

```ts
mode: "create" | "edit";
title: string;
submitLabel: string;
kindLocked: boolean;
amountMode: MoneyExpenseAmountMode;
amountModeOptions: typeof MONEY_EXPENSE_AMOUNT_MODE_OPTIONS;
onAmountModeChange: (mode: MoneyExpenseAmountMode) => void;
```

`expenses` gains `onOpenEdit: (expenseId: string) => void`.

Each list row gains `amountMode` (already implied by `amountLabel` using `moneyExpenseAmountLabel`).

`expenses.payment` gains:

```ts
amountMode: MoneyExpenseAmountMode;
heroLabel: string; // "Remaining" | "This cycle"
heroHint: string;
```

- [ ] **Step 1: Extend row mappers**

Import `moneyExpenseAmountLabel`, `MONEY_EXPENSE_AMOUNT_MODE_OPTIONS`, `moneyExpensePaymentCanSubmit`, `parseMoneyExpensePaymentAmount`.

Add `amountMode` to `MoneyExpenseRecord` usage (API records now include it). Extend the local `MoneySubscriptionCycleRecord` type with `amountMode: MoneyExpenseAmountMode`.

In `toExpenseRow` / `toSubscriptionCycleRow`:

```ts
amountLabel: moneyExpenseAmountLabel({
  amountMode: record.amountMode ?? "fixed",
  amount: record.amount,
  currency: record.currency,
}),
amountMode: record.amountMode ?? "fixed",
```

- [ ] **Step 2: Editor state**

Add:

```ts
const [expenseEditorId, setExpenseEditorId] = useState<string | null>(null);
const [expenseAmountMode, setExpenseAmountMode] = useState<MoneyExpenseAmountMode>("fixed");
```

`resetExpenseCreateForm` also sets `expenseEditorId` to `null` and `expenseAmountMode` to `"fixed"`.

`onExpenseKindChange`: if next is `one_time`, set `expenseAmountMode` to `"fixed"`.

Replace `canSubmitExpense` with:

```ts
const canSubmitExpense = moneyExpenseCanSubmit(
  expenseName,
  expenseKind,
  expensePeriod,
  expenseAmount,
  expenseAmountMode,
);
```

`onOpenEdit(expenseId)`:

```ts
function onOpenExpenseEdit(expenseId: string) {
  const record = expenseRecords.find((item) => item.id === expenseId);
  if (!record) return;
  setExpenseEditorId(record.id);
  setExpenseName(record.name);
  setExpenseKind(record.kind);
  setExpensePeriod(record.period);
  setExpenseAmountMode(record.amountMode ?? "fixed");
  setExpenseAmount(
    record.amountMode === "variable" ? "" : (record.amount / 100).toFixed(2),
  );
  setExpenseNote(record.note);
  setExpenseStartsAt(record.startsAt ? toDateInputValue(new Date(record.startsAt)) : "");
  setExpenseCreateOpen(true);
}
```

`onExpenseCreateSubmit`:

```ts
async function onExpenseCreateSubmit(event: { preventDefault: () => void }) {
  event.preventDefault();
  if (!moneyExpenseCanSubmit(expenseName, expenseKind, expensePeriod, expenseAmount, expenseAmountMode)) {
    return;
  }
  const amount =
    expenseKind === "subscription" && expenseAmountMode === "variable"
      ? 0
      : parseMoneyExpenseAmount(expenseAmount);
  if (amount === null && !(expenseKind === "subscription" && expenseAmountMode === "variable")) {
    return;
  }
  const startsAt =
    expenseKind === "subscription" && expenseStartsAt
      ? dateInputToIso(expenseStartsAt)
      : undefined;

  if (expenseEditorId) {
    await agencyOps.updateExpense(
      {
        teamId,
        expenseId: expenseEditorId,
        name: expenseName,
        period: expensePeriod,
        note: expenseNote,
        amount: amount ?? 0,
        amountMode: expenseKind === "subscription" ? expenseAmountMode : "fixed",
        startsAt,
      },
      { onSuccess: () => onExpenseCreateOpenChange(false) },
    );
    return;
  }

  await agencyOps.createExpense(
    {
      teamId,
      name: expenseName,
      kind: expenseKind,
      period: expensePeriod,
      note: expenseNote,
      amount: amount ?? 0,
      amountMode: expenseKind === "subscription" ? expenseAmountMode : "fixed",
      startsAt,
    },
    { onSuccess: () => onExpenseCreateOpenChange(false) },
  );
}
```

Payment open/submit:

```ts
function onOpenExpensePayment(expenseId: string) {
  const record = expenseRecords.find((item) => item.id === expenseId);
  setExpensePaymentId(expenseId);
  if (!record || record.amountMode === "variable") {
    setExpensePaymentAmount("");
    return;
  }
  setExpensePaymentAmount((record.remainingAmount / 100).toFixed(2));
}

const expensePaymentCanSubmit = expensePaymentRow
  ? moneyExpensePaymentCanSubmit(
      expensePaymentAmount,
      expensePaymentRow.remainingAmount,
      expensePaymentRow.amountMode,
    )
  : false;
```

In `onExpensePaymentSubmit`, parse with `parseMoneyExpensePaymentAmount(..., expensePaymentRow.amountMode)` instead of `parseMoneyBillPaymentAmount`.

Wire `create` view model:

```ts
mode: expenseEditorId ? "edit" : "create",
title: expenseEditorId ? "Edit expense" : "Add expense",
submitLabel: expenseEditorId ? "Save" : "Add",
kindLocked: Boolean(expenseEditorId),
amountMode: expenseAmountMode,
amountModeOptions: MONEY_EXPENSE_AMOUNT_MODE_OPTIONS,
onAmountModeChange: setExpenseAmountMode,
```

Payment view model:

```ts
amountMode: expensePaymentRow?.amountMode ?? "fixed",
heroLabel: expensePaymentRow?.amountMode === "variable" ? "This cycle" : "Remaining",
heroHint:
  expensePaymentRow?.kind === "subscription"
    ? expensePaymentRow.amountMode === "variable"
      ? "Enter this cycle's amount. Paying records it and rolls the next due forward."
      : "Paying in full rolls the next due forward and hides this row until then."
    : "",
heroValue:
  expensePaymentRow?.amountMode === "variable"
    ? "Variable"
    : expensePaymentRow?.remainingLabel ?? "—",
```

Pass `onOpenEdit: onOpenExpenseEdit`.

- [ ] **Step 3: Update the presentational view**

In `agency-money-expenses-section-view.tsx`:

1. Dialog title uses `create.title`. Badge stays Type. Description: if `create.kind === "subscription"` and `create.amountMode === "variable"`, use "Recurring charge. Amount is set each time you Pay." Otherwise keep today's copy.
2. Type `Select` gets `disabled={create.kindLocked}`.
3. When `create.kind === "subscription"`, add an Amount type `Select` bound to `create.amountMode` / `create.amountModeOptions` / `create.onAmountModeChange`. Under Variable, render:

```tsx
<p className="text-[11px] text-muted text-pretty">
  Enter this cycle's amount when you Pay.
</p>
```

4. Render the Amount field only when `create.kind !== "subscription" || create.amountMode === "fixed"`.
5. Submit button label is `create.submitLabel`.
6. `ExpensesGroup` takes `onOpenEdit`. The name is a `Button variant="link"` (or `<button type="button">` styled as the current name) calling `onOpenEdit(item.expenseId)`. Do not make the whole card a button; Pay must stay a separate control.
7. Details list names use the same edit affordance.
8. Payment hero label/value/hint come from the view model. When `payment.amountMode === "variable"`, do not show a remaining currency figure as the hero value; show `payment.heroValue` (`Variable`) and the amount field as the actual input.

Keep existing panel radius, tokens, and Pay link. No new icons beyond what the dialog already uses.

- [ ] **Step 4: Conventions and types**

Run:

```bash
bun run check
bun run check-types
bun run check:conventions
bun test apps/web/src/features/billing/money-expense-form.test.ts packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
```

Expected: all pass. If `check:conventions` reports pre-existing golden-view violations outside these files, do not "fix" them in this task.

- [ ] **Step 5: Browser verify**

On `/agency/management/money` as an owner:

1. Create a fixed monthly subscription (Adobe-like). Amount shows. Pay still uses Remaining and advances next due.
2. Click the name. Dialog title is Edit expense. Type is locked. Save a name/note change. Paid occurrences do not change.
3. Add a variable monthly subscription. Amount field is hidden. Row shows `Variable` and Pay.
4. Pay with `1240`. Scoreboard Expenses increases by that amount. Row leaves Due until next cycle. Paid visibility shows the snapshotted amount, not `Variable`.
5. Edit the variable template (name only). Historical paid amount stays.
6. One-time row name opens edit; amount remains required.
7. Desktop and a narrow viewport: dialog still usable, name click vs Pay do not collide.

- [ ] **Step 6: Commit only if the user asked**

```bash
git add apps/web/src/features/money/hooks/use-agency-money-surface.ts apps/web/src/features/money/agency-money-expenses-section-view.tsx
git commit -m "feat(web): edit expenses and pay variable subscriptions"
```

---

### Task 7: Constraints, inventory, and finish checks

**Files:**

- Modify: `plans/managment-money-rework/sources/product-constraints.md`
- Modify: `docs/golden-file-source-inventory.md`

**Interfaces:**

- Consumes: shipped behavior from Tasks 1–6
- Produces: documented constraint + inventory row

- [ ] **Step 1: Update product constraints**

In the Expenses bullet in `plans/managment-money-rework/sources/product-constraints.md`, after the paid-occurrence sentence, add:

```text
- Subscriptions may be Fixed or Variable. Variable keeps the billing cadence
  but stores no template amount; Pay records this cycle's amount, snapshots
  the occurrence, and advances next due. Unpaid variable due does not add to
  the Expenses scoreboard. Edit updates the template only; paid occurrences
  stay immutable.
```

- [ ] **Step 2: Inventory the migration**

Insert after the `0057_agency_expense_occurrence.sql` row in `docs/golden-file-source-inventory.md` (and after `0058` if that row is present):

```md
| `packages/db/src/migrations/0059_agency_expense_amount_mode.sql` | database-platform | persistence-migration | shared-infrastructure | data-platform | Cross-cutting database-platform persistence-migration support rather than a feature-owned business workflow. | content: SQL schema mutation statements; structure: ordered migration path |
```

If `0058_agency_salary_pool_paid_amount.sql` is missing from the inventory, add it in the same pass so `bun run check:golden` is clean.

- [ ] **Step 3: Finish checks**

Run:

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

Expected: PASS.

- [ ] **Step 4: Commit only if the user asked**

```bash
git add plans/managment-money-rework/sources/product-constraints.md docs/golden-file-source-inventory.md
git commit -m "docs: record variable subscription expense constraints"
```

---

## Self-review

**Spec coverage**

| Requirement | Task |
|---|---|
| Edit existing subscription / one-time | 5, 6 |
| Variable amount option, still a subscription | 1–4, 6 |
| Pay different amount each cycle | 2, 4, 6 |
| Scoreboard uses paid occurrence, not unpaid `0` | 2, 4 |
| Paid history immutable | 4, 6 |
| Golden layers / presentational view | 5, 6, 7 |

**Placeholder scan:** no TBD / "implement later" / "add validation" without the actual guard.

**Type consistency:** `amountMode` is `"fixed" | "variable"` from schema through helpers, service, router, form, store, hook, and view.
