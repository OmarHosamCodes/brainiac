# Expense Subscription Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Due/Paid subscription visibility controls that reveal persisted paid cycles without changing the Expenses scoreboard total.

**Architecture:** Keep the generic expense list unchanged and add a dedicated subscription-cycle API backed by current subscription templates plus immutable `agency_ops_expense_occurrence` rows. The Money hook owns visibility state and orchestration; the view renders a shadcn checkbox dropdown and display-ready rows.

**Tech Stack:** Bun test, TypeScript, Drizzle ORM, oRPC/Zod, React 19, TanStack Query, shadcn DropdownMenu.

## Global Constraints

- Due is enabled and Paid is disabled by default.
- Paid cycles are scoped to the selected Money period; current due and overdue subscriptions remain visible through the selected period end.
- Paid rows are read-only; partial current cycles remain Due and payable.
- Visibility never changes the Expenses scoreboard total.
- Views remain presentational and cannot call hooks.
- Use integer minor units end-to-end.
- Do not create commits unless the user explicitly requests them.

---

### Task 1: Build and expose subscription cycle history

**Files:**

- Modify: `packages/api/src/routers/agency-ops/billing/expense-helpers.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/expense-service.ts`
- Modify: `packages/api/src/routers/agency-ops/billing/router.ts`

**Interfaces:**

- Produces:

```ts
export type AgencySubscriptionCycleRecord = {
  id: string;
  expenseId: string;
  state: "due" | "paid";
  name: string;
  note: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  period: AgencyOpsExpensePeriod;
  dueAt: string;
  canRecordPayment: boolean;
};

export async function listSubscriptionCycles(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<AgencySubscriptionCycleRecord[]>;
```

- [ ] **Step 1: Write failing cycle-composition tests**

Add tests to `expense-helpers.test.ts` for `buildSubscriptionCycleRecords`. The minimum fixture must contain:

```ts
const periodStart = new Date("2026-08-01T00:00:00.000Z");
const periodEnd = new Date("2026-09-01T00:00:00.000Z");
const records = buildSubscriptionCycleRecords({
  periodStart,
  periodEnd,
  subscriptions: [
    {
      id: "expense-1",
      name: "Adobe",
      note: "",
      amount: 178_000,
      paidAmount: 0,
      currency: "EGP",
      period: "monthly",
      nextDueAt: new Date("2026-09-24T00:00:00.000Z"),
    },
    {
      id: "expense-2",
      name: "Hosting",
      note: "",
      amount: 50_000,
      paidAmount: 10_000,
      currency: "EGP",
      period: "monthly",
      nextDueAt: new Date("2026-08-20T00:00:00.000Z"),
    },
  ],
  occurrences: [
    {
      id: "occurrence-1",
      expenseId: "expense-1",
      name: "Adobe",
      note: "",
      amount: 178_000,
      paidAmount: 178_000,
      currency: "EGP",
      period: "monthly",
      dueAt: new Date("2026-08-24T00:00:00.000Z"),
    },
  ],
});
```

Assert that Adobe produces a read-only `paid` cycle for 24 Aug and Hosting produces a payable `due` cycle with `remainingAmount: 40_000`. Add boundary assertions proving paid occurrences before `periodStart` or at/after `periodEnd` are excluded, while an overdue current subscription due before `periodStart` is retained.

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
```

Expected: FAIL because `buildSubscriptionCycleRecords` is not exported.

- [ ] **Step 3: Implement the pure cycle composer**

In `expense-helpers.ts`, export the input row types, `AgencySubscriptionCycleRecord`, and:

```ts
export function buildSubscriptionCycleRecords(input: {
  periodStart: Date;
  periodEnd: Date;
  subscriptions: SubscriptionTemplateRow[];
  occurrences: PaidSubscriptionOccurrenceRow[];
}): AgencySubscriptionCycleRecord[] {
  const due = input.subscriptions
    .filter((row) => row.nextDueAt && row.nextDueAt < input.periodEnd)
    .map((row) => ({
      id: `due:${row.id}:${row.nextDueAt!.toISOString()}`,
      expenseId: row.id,
      state: "due" as const,
      name: row.name,
      note: row.note,
      amount: row.amount,
      paidAmount: row.paidAmount,
      remainingAmount: expenseRemainingAmount(row.amount, row.paidAmount),
      currency: row.currency,
      period: row.period,
      dueAt: row.nextDueAt!.toISOString(),
      canRecordPayment: true,
    }));
  const paid = input.occurrences
    .filter(
      (row) =>
        row.paidAmount >= row.amount &&
        row.dueAt >= input.periodStart &&
        row.dueAt < input.periodEnd,
    )
    .map((row) => ({
      id: row.id,
      expenseId: row.expenseId,
      state: "paid" as const,
      name: row.name,
      note: row.note,
      amount: row.amount,
      paidAmount: row.paidAmount,
      remainingAmount: 0,
      currency: row.currency,
      period: row.period,
      dueAt: row.dueAt.toISOString(),
      canRecordPayment: false,
    }));
  return [
    ...due.sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    ...paid.sort((a, b) => b.dueAt.localeCompare(a.dueAt)),
  ];
}
```

Avoid non-null assertions in the final implementation by narrowing `nextDueAt` before mapping.

- [ ] **Step 4: Re-run the focused tests**

Run the same Bun test. Expected: all expense helper tests PASS.

- [ ] **Step 5: Add the owner-scoped service query**

In `expense-service.ts`, add `listSubscriptionCycles(actorUserId, input)`:

1. Call `requireTeamMembership(actorUserId, input.teamId, "owner")`.
2. Parse and validate `periodStart < periodEnd`.
3. Select current subscription templates for the team.
4. Select occurrence rows joined to `agencyOpsExpense`, filtered by team and occurrence `dueAt` in `[periodStart, periodEnd)`.
5. Pass both row sets to `buildSubscriptionCycleRecords`.

The occurrence select must use the occurrence’s snapshotted `amount`, `paidAmount`, and `currency`, while name, note, and cadence come from the joined subscription template.

- [ ] **Step 6: Expose and parse the oRPC procedure**

In `router.ts`, add a `subscriptionCycles` procedure under `expenses` with required period bounds. Parse output with:

```ts
const subscriptionCycleRecordSchema = z.object({
  id: z.string().min(1),
  expenseId: z.string().min(1),
  state: z.enum(["due", "paid"]),
  name: z.string().min(1),
  note: z.string(),
  amount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  period: expensePeriodSchema,
  dueAt: z.string().datetime(),
  canRecordPayment: z.boolean(),
});
```

- [ ] **Step 7: Typecheck the API**

Run:

```bash
bun run check-types --filter=@orch/api --filter=@orch/db
```

Expected: PASS.

---

### Task 2: Add tested visibility and count logic

**Files:**

- Create: `apps/web/src/features/billing/money-subscription-visibility.ts`
- Create: `apps/web/src/features/billing/money-subscription-visibility.test.ts`
- Modify: `docs/golden-file-source-inventory.md`

**Interfaces:**

- Consumes: `state: "due" | "paid"` from Task 1.
- Produces:

```ts
export type MoneySubscriptionVisibility = { due: boolean; paid: boolean };
export function filterSubscriptionCycles<T extends { state: "due" | "paid" }>(
  cycles: T[],
  visibility: MoneySubscriptionVisibility,
): T[];
export function subscriptionCountLabel(
  count: number,
  visibility: MoneySubscriptionVisibility,
): string;
```

- [ ] **Step 1: Write failing visibility tests**

Test these exact cases:

```ts
expect(filterSubscriptionCycles(cycles, { due: true, paid: false })).toEqual([dueCycle]);
expect(filterSubscriptionCycles(cycles, { due: false, paid: true })).toEqual([paidCycle]);
expect(filterSubscriptionCycles(cycles, { due: true, paid: true })).toEqual(cycles);
expect(filterSubscriptionCycles(cycles, { due: false, paid: false })).toEqual([]);
expect(subscriptionCountLabel(2, { due: true, paid: false })).toBe("2 due");
expect(subscriptionCountLabel(1, { due: false, paid: true })).toBe("1 paid");
expect(subscriptionCountLabel(3, { due: true, paid: true })).toBe("3 shown");
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
bun test apps/web/src/features/billing/money-subscription-visibility.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Create `money-subscription-visibility.ts` with the two functions above. Use direct boolean filtering and an exhaustive label choice; do not add persistence or URL state.

- [ ] **Step 4: Re-run the visibility tests**

Run the focused Bun test. Expected: PASS.

- [ ] **Step 5: Add golden inventory rows**

Add both new files to `docs/golden-file-source-inventory.md` using the checker’s expected `billing` domain classifications. Run:

```bash
bun run check:golden
```

Expected for these files: no missing or semantic-mismatch errors. Existing unrelated inventory failures may remain and must be reported separately.

---

### Task 3: Wire the query and checkbox menu

**Files:**

- Modify: `apps/web/src/features/money/hooks/use-agency-money-surface.ts`
- Modify: `apps/web/src/features/money/agency-money-expenses-section-view.tsx`

**Interfaces:**

- Consumes: `orpc.agencyOps.expenses.subscriptionCycles`, `filterSubscriptionCycles`, and `subscriptionCountLabel`.
- Produces view-model visibility:

```ts
visibility: {
  due: boolean;
  paid: boolean;
  onDueChange: (checked: boolean) => void;
  onPaidChange: (checked: boolean) => void;
}
```

- [ ] **Step 1: Add the cycle query and local visibility state**

In the hook:

```ts
const [subscriptionVisibility, setSubscriptionVisibility] = useState<MoneySubscriptionVisibility>({
  due: true,
  paid: false,
});

const subscriptionCyclesQuery = useQuery({
  ...orpc.agencyOps.expenses.subscriptionCycles.queryOptions({
    input: {
      teamId,
      periodStart: periodRange.from,
      periodEnd: periodRange.to,
    },
  }),
  enabled: Boolean(teamId) && isOwner,
});
```

Include this query in the Expenses loading, error, retry, and post-payment invalidation paths.

- [ ] **Step 2: Map cycle records to display rows**

Filter query records with `filterSubscriptionCycles`. Map each record to a row with:

- `id`: stable cycle ID.
- `expenseId`: parent expense ID.
- `meta`: due rows use the existing cadence/next-date copy; paid rows use `<Cadence> · Paid for <localized due date>`.
- `statusLabel`: `Paid` for paid cycles and existing status copy for due cycles.
- `canRecordPayment`: the API boolean.

Update existing one-time rows to set `expenseId: record.id`. Change payment callbacks in the view from `item.id` to `item.expenseId`.

- [ ] **Step 3: Expose visibility state in the view model**

Set the subscription group to:

```ts
{
  id: "upcoming",
  title: "Subscriptions",
  hint: "This period",
  emptyTitle:
    !subscriptionVisibility.due && !subscriptionVisibility.paid
      ? "No visibility selected"
      : subscriptionVisibility.paid && !subscriptionVisibility.due
        ? "No paid subscriptions this period"
        : "Nothing due soon",
  emptyBody:
    !subscriptionVisibility.due && !subscriptionVisibility.paid
      ? "Choose Due or Paid from visibility."
      : "Change visibility to inspect other subscription cycles.",
  count: visibleSubscriptionCycles.length,
  countLabel: subscriptionCountLabel(visibleSubscriptionCycles.length, subscriptionVisibility),
  items: visibleSubscriptionRows,
  visibility: {
    ...subscriptionVisibility,
    onDueChange: (due) => setSubscriptionVisibility((current) => ({ ...current, due })),
    onPaidChange: (paid) => setSubscriptionVisibility((current) => ({ ...current, paid })),
  },
}
```

- [ ] **Step 4: Render the shadcn checkbox dropdown**

In the view, import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`, `DropdownMenuSeparator`, and `DropdownMenuItem` from `@/ui/dropdown-menu`.

For subscription groups, render:

```tsx
<DropdownMenu>
  <Tooltip>
    <TooltipTrigger asChild>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Subscription visibility">
          <List className="size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
    </TooltipTrigger>
    <TooltipContent side="bottom">Subscription visibility</TooltipContent>
  </Tooltip>
  <DropdownMenuContent align="end">
    <DropdownMenuCheckboxItem
      checked={group.visibility.due}
      onCheckedChange={(checked) => group.visibility.onDueChange(checked === true)}
    >
      Due
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={group.visibility.paid}
      onCheckedChange={(checked) => group.visibility.onPaidChange(checked === true)}
    >
      Paid
    </DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onOpenDetails}>View all expenses</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Keep the existing direct “All expenses” icon behavior for the one-time group.

- [ ] **Step 5: Run focused tests and typechecks**

Run:

```bash
bun test packages/api/src/routers/agency-ops/billing/expense-helpers.test.ts
bun test apps/web/src/features/billing/money-subscription-visibility.test.ts
bun run check-types
bunx oxlint packages/api/src/routers/agency-ops/billing/expense-helpers.ts packages/api/src/routers/agency-ops/billing/expense-service.ts packages/api/src/routers/agency-ops/billing/router.ts apps/web/src/features/billing/money-subscription-visibility.ts apps/web/src/features/money/hooks/use-agency-money-surface.ts apps/web/src/features/money/agency-money-expenses-section-view.tsx
```

Expected: focused tests, typecheck, and targeted lint PASS.

- [ ] **Step 6: Run architecture checks**

Run:

```bash
bun run check:conventions
bun run check:golden
```

Expected: no new violations from the changed files. Record unrelated pre-existing violations without expanding scope.

- [ ] **Step 7: Verify the Money workflow in the browser**

On `/agency/management/money`:

1. Confirm the subscription list defaults to Due only.
2. Confirm the paid EGP 50,000 and EGP 1,780 cycles are absent from Due.
3. Enable Paid and confirm both paid rows appear with no Pay action.
4. Enable Due and Paid and confirm both categories can coexist.
5. Toggle visibility off and on and confirm the scoreboard Expenses amount remains EGP 58,290 for the current dataset.
6. Confirm the menu remains keyboard accessible and the button has the `Subscription visibility` accessible name.

Capture one screenshot showing the open checkbox menu, paid rows, and unchanged scoreboard total.

---

## Self-Review

- Spec coverage: interaction, cycle history, due/paid semantics, empty states, scoreboard independence, and browser verification are each assigned to a task.
- Placeholder scan: no TBD/TODO/“implement later” steps remain.
- Type consistency: `AgencySubscriptionCycleRecord`, `MoneySubscriptionVisibility`, `expenseId`, and visibility handler names match across tasks.
- Scope: one API addition, one tested web helper, and existing hook/view wiring; no unrelated refactor or dependency.
