# Agency Orch Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Orch check time gaps, draft client bills, act on Needs-action alerts, suggest an existing tracker task, and propose waste on a single live-report entry — always as HITL plans/proposals, never as silent writes.

**Architecture:** Extend `AgencyAgentRuntime` with read methods and one new write action (`money.export_client`). Gap math is a pure helper over existing time entries (no Cursor/OpenCode/Codex local DBs). Featured rail `member.alert` seeds Plan mode. Tracker shows an explicit "Use existing task" chip. Waste proposals are `time_entry.update` with `isWaste: true` on **one entryId**. Approve/Reject on the existing proposal bus.

**Tech Stack:** Bun, Drizzle, oRPC, `@orch/agent` tools, Agency time-tracking + billing services, workspace-agent composer.

## Global Constraints

- Bun only. Golden layers. Views props-only.
- Browser: `@orch/agent/types`, never `@orch/agent` barrel.
- Writes never apply in the tool path. Ask = read + `ui_present`. Plan = `draft_agency_plan` after `ask_agency_question`. Agent = `propose_agency_action` then `ui_present` then human Approve.
- Product language: `amount` (integer minor units). Never expose "cents".
- Time entries stay second-precise. No rounding to minutes.
- Waste marks apply only to the targeted entry, never a whole day/group.
- Tracker description suggestions never implicitly change the selected task. Apply task only on explicit pick.
- Gap-fill in Orch does **not** scrape `~/.cursor`, OpenCode, or Codex. That stays the Cursor skill `agency-time-gap-fill`. In-app check = uncovered windows vs tracked entries in from→to (default today). Insert only via proposal `time_entry.create` after the user confirms.
- Money export persists a composed bill. It must **not** email/send invoices.
- `listPeriodMoneyObligations` / `exportMoneyDocuments` require team **owner**. Agent runtime must use the same `requireTeamMembership(..., "owner")` path — fail closed.
- No Prompt library. No Voice/MCP/quota/runner demos.
- Tests: co-located `bun:test`. No component render tests.
- `bun run check`, `check-types`, `check:conventions`, `check:golden` before finish.

## File map

| File | Responsibility |
| ---- | -------------- |
| `packages/api/src/routers/agency-ops/time-tracking/time-gaps.ts` | Pure gap carving (≥60s) + neighbor inheritance |
| `packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts` | Gap tests |
| `packages/api/src/routers/agency-ops/time-tracking/service.ts` | `listMyAgencyTimeEntriesInRange` |
| `packages/agent/src/types.ts` | Runtime methods: gaps, alerts, money obligations |
| `packages/agent/src/agency-tools.ts` | `list_agency_time_gaps`, `list_member_profile_alerts`, `get_agency_client_bill` |
| `packages/agent/src/tool-catalog.ts` | Catalog entries |
| `packages/agent/src/tool-catalog.test.ts` | Catalog assertions |
| `packages/agent/src/agency-actions.ts` | `money.export_client` |
| `packages/agent/src/agency-actions.test.ts` | Parse/label tests |
| `packages/agent/src/index.ts` | Agency Plan/Agent instructions for gaps, bills, waste, alerts |
| `packages/api/src/routers/agent/service.ts` | Wire runtime methods |
| `packages/api/src/routers/agent/agency-proposals.ts` | Before/after/execute for `money.export_client` |
| `apps/web/src/features/notifications/notification-presentation.ts` | `member.alert` CTA → Ask Orch |
| `apps/web/src/features/notifications/hooks/use-featured-rail-notification.ts` | Expand composer + seed Plan |
| `apps/web/src/features/time-tracking/description-suggestions.ts` | `existingTaskSuggestionFromRanked` |
| `apps/web/src/features/time-tracking/description-suggestions.test.ts` | Chip tests |
| `apps/web/src/features/reports/*` | Optional "Ask Orch" on a single waste cell |

---

### Task 1: Time-gap carving helper

**Files:**
- Create: `packages/api/src/routers/agency-ops/time-tracking/time-gaps.ts`
- Test: `packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts`

**Interfaces:**
- Consumes: `{ startedAt, endedAt, projectId, taskId }[]` plus window `{ fromMs, toMs }`
- Produces: `AgencyTimeGap[]` with `startAt`, `endAt`, `durationSeconds`, inherited `projectId`/`taskId`

Rules (locked):

- Gaps ≥ **60** seconds only
- Window: `fromMs` inclusive, `toMs` exclusive-or-clamped (use `endedAt <= toMs`)
- Sort entries by `startedAt`
- Emit: window start → first start; between consecutive non-overlapping entries; last end → window end
- Overlapping entries do not create negative gaps
- Neighbor inheritance: previous entry by end, else next by start (same as the Cursor skill, without Cursor sources)
- Times stay ISO UTC strings; durations are integer seconds

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { carveAgencyTimeGaps } from "./time-gaps";

describe("carveAgencyTimeGaps", () => {
  test("returns the full window when there are no entries", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T08:00:00.000Z"),
      entries: [],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.durationSeconds).toBe(7200);
    expect(gaps[0]?.projectId).toBeNull();
  });

  test("ignores gaps under 60 seconds", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T06:10:00.000Z"),
      entries: [
        {
          startedAt: "2026-08-14T06:00:00.000Z",
          endedAt: "2026-08-14T06:09:30.000Z",
          projectId: "p1",
          taskId: "t1",
        },
      ],
    });
    expect(gaps).toEqual([]);
  });

  test("inherits project and task from the previous neighbor", () => {
    const gaps = carveAgencyTimeGaps({
      fromMs: Date.parse("2026-08-14T06:00:00.000Z"),
      toMs: Date.parse("2026-08-14T09:00:00.000Z"),
      entries: [
        {
          startedAt: "2026-08-14T06:00:00.000Z",
          endedAt: "2026-08-14T07:00:00.000Z",
          projectId: "p1",
          taskId: "t1",
        },
      ],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.projectId).toBe("p1");
    expect(gaps[0]?.taskId).toBe("t1");
    expect(gaps[0]?.durationSeconds).toBe(7200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts`
Expected: FAIL module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
export const AGENCY_TIME_GAP_MIN_SECONDS = 60;

export type AgencyTimeGapEntry = {
  startedAt: string;
  endedAt: string;
  projectId: string | null;
  taskId: string | null;
};

export type AgencyTimeGap = {
  startAt: string;
  endAt: string;
  durationSeconds: number;
  projectId: string | null;
  taskId: string | null;
};

function toMs(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function carveAgencyTimeGaps(input: {
  fromMs: number;
  toMs: number;
  entries: readonly AgencyTimeGapEntry[];
}): AgencyTimeGap[] {
  const windowStart = input.fromMs;
  const windowEnd = input.toMs;
  if (!(windowEnd > windowStart)) return [];

  const ordered = [...input.entries]
    .map((entry) => {
      const startedAt = toMs(entry.startedAt);
      const endedAt = toMs(entry.endedAt);
      if (startedAt === null || endedAt === null || endedAt <= startedAt) return null;
      return { ...entry, startedAtMs: startedAt, endedAtMs: endedAt };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.startedAtMs - right.startedAtMs);

  const cursorEnds: number[] = [windowStart];
  const gaps: AgencyTimeGap[] = [];

  for (const [index, entry] of ordered.entries()) {
    const gapStart = Math.max(cursorEnds[cursorEnds.length - 1] ?? windowStart, windowStart);
    const gapEnd = Math.min(entry.startedAtMs, windowEnd);
    pushGap(gaps, gapStart, gapEnd, ordered[index - 1] ?? null, entry);
    cursorEnds.push(Math.max(entry.endedAtMs, gapStart));
  }

  const last = ordered[ordered.length - 1] ?? null;
  const tailStart = Math.max(last?.endedAtMs ?? windowStart, windowStart);
  pushGap(gaps, tailStart, windowEnd, last, null);
  return gaps;
}

function pushGap(
  gaps: AgencyTimeGap[],
  startMs: number,
  endMs: number,
  previous: { projectId: string | null; taskId: string | null } | null,
  next: { projectId: string | null; taskId: string | null } | null,
) {
  const durationSeconds = Math.floor((endMs - startMs) / 1000);
  if (durationSeconds < AGENCY_TIME_GAP_MIN_SECONDS) return;
  const neighbor = previous ?? next;
  gaps.push({
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    durationSeconds,
    projectId: neighbor?.projectId ?? null,
    taskId: neighbor?.taskId ?? null,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/agency-ops/time-tracking/time-gaps.ts packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts
git commit -m "$(cat <<'EOF'
feat: carve Agency time gaps from tracked entries

In-app gap-fill reports uncovered windows without reading local AI chat databases.
EOF
)"
```

---

### Task 2: `list_agency_time_gaps` tool

**Files:**
- Modify: `packages/api/src/routers/agency-ops/time-tracking/service.ts` — add `listMyAgencyTimeEntriesInRange(actorUserId, { teamId, from, to })` reusing the same select as `listMyAgencyTimeEntries` with `gte(startedAt)` / `lte(endedAt)` on the window. Cap 500 rows.
- Modify: `packages/agent/src/types.ts` — `listTimeGaps` on `AgencyAgentRuntime`
- Modify: `packages/api/src/routers/agent/service.ts` — implement runtime method with `carveAgencyTimeGaps`
- Modify: `packages/agent/src/agency-tools.ts`
- Modify: `packages/agent/src/tool-catalog.ts`
- Modify: `packages/agent/src/tool-catalog.test.ts`
- Modify: `packages/agent/src/index.ts` — Ask/Plan/Agent copy: check then propose; never insert during check

**Interfaces:**
- Consumes: `carveAgencyTimeGaps`, `agencyDateRangeInputSchema`
- Produces: tool `list_agency_time_gaps` on Agency Ask/Plan/Agent

- [ ] **Step 1: Write failing catalog test**

In `packages/agent/src/tool-catalog.test.ts`, inside the existing agency ask test:

```typescript
expect(names).toContain("list_agency_time_gaps");
```

Also assert canvas ask does **not** contain it unless Agency is unlocked.

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/tool-catalog.test.ts`
Expected: FAIL `list_agency_time_gaps`

- [ ] **Step 3: Implement runtime + tool**

`AgencyAgentRuntime` addition:

```typescript
listTimeGaps: (input: { from: string; to: string }) => Promise<{
  from: string;
  to: string;
  trackedSeconds: number;
  gapSeconds: number;
  gaps: Array<{
    startAt: string;
    endAt: string;
    durationSeconds: number;
    projectId: string | null;
    taskId: string | null;
  }>;
}>;
```

Tool (Ask/Plan/Agent, Agency surface):

```typescript
tool({
  name: "list_agency_time_gaps",
  description:
    "Check uncovered time windows vs the current user's tracked entries for from/to (YYYY-MM-DD). Does not insert entries. Default the model should use today when the user omits a range.",
  inputSchema: agencyDateRangeInputSchema,
  outputSchema: z.object({
    from: z.string(),
    to: z.string(),
    trackedSeconds: z.number().int().nonnegative(),
    gapSeconds: z.number().int().nonnegative(),
    gaps: z.array(
      z.object({
        startAt: z.string(),
        endAt: z.string(),
        durationSeconds: z.number().int().nonnegative(),
        projectId: z.string().nullable(),
        taskId: z.string().nullable(),
      }),
    ),
  }),
  execute: async (input) => runtime.listTimeGaps(flattenAgencyDateRangeInput(input)),
}),
```

Catalog entry: `surface: ["agency"]`, `modes: ALL_MODES`.

Instructions (append to `buildAgencyInstructions` in `packages/agent/src/index.ts`):

```text
Time gap fill: call list_agency_time_gaps first. Report window, tracked hours, uncovered rows, and projected total. Do not propose time_entry.create until the user asks to insert. New entries must not overlap existing ones. Inherit project/task from the gap neighbor. Never mark a whole day as waste.
```

Plan/Agent: insert = `time_entry.create` per gap (description `"UX"` is allowed only if the user asked for that; otherwise use a short description from the user). One proposal per entry unless the user asks for a batch. Always `ui_present` before/after.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/tool-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/agency-ops/time-tracking/service.ts packages/agent/src/types.ts packages/agent/src/agency-tools.ts packages/agent/src/tool-catalog.ts packages/agent/src/tool-catalog.test.ts packages/agent/src/index.ts packages/api/src/routers/agent/service.ts
git commit -m "$(cat <<'EOF'
feat: add Orch list_agency_time_gaps read tool

Check uncovered windows in Ask/Plan before any time_entry.create proposal.
EOF
)"
```

---

### Task 3: `money.export_client` action

**Files:**
- Modify: `packages/agent/src/agency-actions.ts`
- Modify: `packages/agent/src/agency-actions.test.ts`
- Modify: `packages/api/src/routers/agent/agency-proposals.ts` (`loadAgencyActionBefore`, after-map, `executeAgencyAction`)
- Modify: `packages/api/src/routers/agency-ops/billing/money-export-service.ts` only if `ExportSelection` must be exported — prefer calling `exportMoneyDocuments` from execute with selections built from listed obligations

**Interfaces:**
- Consumes: `exportMoneyDocuments(actorUserId, { teamId, partyType: "client", partyId, mode, selections })`
- Produces: `AgencyAction` variant `money.export_client`

Schema:

```typescript
z.object({
  type: z.literal("money.export_client"),
  clientId: idSchema,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  mode: z.enum(["combine", "split"]).default("combine"),
}),
```

Label: `"Export client bill"`.

This persists the composed bill. It does not send/email. Keep the existing test that **rejects** `invoice.create`.

- [ ] **Step 1: Write failing tests**

In `agency-actions.test.ts`:

```typescript
test("parses money.export_client", () => {
  const action = agencyActionSchema.parse({
    type: "money.export_client",
    clientId: "client-1",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-31T23:59:59.000Z",
    mode: "combine",
  });
  expect(agencyActionLabel(action)).toBe("Export client bill");
});

test("still rejects invoice.create", () => {
  expect(() =>
    agencyActionSchema.parse({
      type: "invoice.create",
      name: "Nope",
    }),
  ).toThrow();
});
```

(Keep the existing reject test; do not delete it.)

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/agency-actions.test.ts`
Expected: FAIL parse `money.export_client`

- [ ] **Step 3: Implement schema + execute**

Add the variant to the discriminated union **before** the closing of `agencyActionSchema`.

`agencyActionLabel` case:

```typescript
case "money.export_client":
  return "Export client bill";
```

`loadAgencyActionBefore`: list obligations for that client/period (call `listPeriodMoneyObligations`) and return the matching client rows (current + carry) plus amounts.

After-map: `{ exported: true, clientId, documents }` from execute result.

`executeAgencyAction`:

```typescript
case "money.export_client": {
  const listed = await listPeriodMoneyObligations(actorUserId, {
    teamId,
    periodStart: action.periodStart,
    periodEnd: action.periodEnd,
  });
  const rows = listed.clients.filter((row) => row.clientId === action.clientId);
  if (rows.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "No client bill for that period." });
  }
  const selections = rows.map((row) => ({
    obligationId: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    kind: row.kind === "invoice" ? "invoice" : "ready",
    amount: row.remainingAmount,
  }));
  return exportMoneyDocuments(actorUserId, {
    teamId,
    partyType: "client",
    partyId: action.clientId,
    mode: action.mode ?? "combine",
    selections,
  });
}
```

If `ExportSelection` is file-private, export it from `money-export-service.ts` or duplicate the object shape inline (same fields).

Exhaustive `never` switches in before/after/execute/label **must** include the new variant.

- [ ] **Step 4: Run tests**

Run: `bun test packages/agent/src/agency-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/agency-actions.ts packages/agent/src/agency-actions.test.ts packages/api/src/routers/agent/agency-proposals.ts packages/api/src/routers/agency-ops/billing/money-export-service.ts
git commit -m "$(cat <<'EOF'
feat: propose client bill export through Orch HITL

Compose-on-demand stays a proposal; Approve persists, nothing is auto-sent.
EOF
)"
```

---

### Task 4: Money read tool + instructions

**Files:**
- Modify: `packages/agent/src/types.ts` — `getClientBill`
- Modify: `packages/api/src/routers/agent/service.ts`
- Modify: `packages/agent/src/agency-tools.ts`
- Modify: `packages/agent/src/tool-catalog.ts`
- Modify: `packages/agent/src/tool-catalog.test.ts`
- Modify: `packages/agent/src/index.ts`

**Interfaces:**
- Consumes: `listPeriodMoneyObligations`
- Produces: `get_agency_client_bill`

- [ ] **Step 1: Catalog test**

```typescript
expect(names).toContain("get_agency_client_bill");
```

in agency ask/agent tests. Not in canvas-only ask.

- [ ] **Step 2: Run to fail**

Run: `bun test packages/agent/src/tool-catalog.test.ts`

- [ ] **Step 3: Implement**

Runtime:

```typescript
getClientBill: (input: {
  clientId: string;
  periodStart: string;
  periodEnd: string;
}) => Promise<{
  clientId: string;
  clientName: string | null;
  amount: number;
  remainingAmount: number;
  wasteAmount: number;
  lines: Array<{
    id: string;
    kind: "invoice" | "ready";
    isCarry: boolean;
    periodStart: string;
    periodEnd: string;
    amount: number;
    remainingAmount: number;
  }>;
}>;
```

Tool description: "Read one client's composed bill for a period (current + carry). Amounts are integer minor units. Does not export or send."

Instructions:

```text
Money: get_agency_client_bill then ui_present before/after amounts. In Agent mode propose money.export_client only when the user asks to export/persist. Never say an invoice was sent.
```

- [ ] **Step 4: Run catalog tests**

Run: `bun test packages/agent/src/tool-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent/src/types.ts packages/agent/src/agency-tools.ts packages/agent/src/tool-catalog.ts packages/agent/src/tool-catalog.test.ts packages/agent/src/index.ts packages/api/src/routers/agent/service.ts
git commit -m "$(cat <<'EOF'
feat: let Orch read a client bill before proposing export

Ask/Plan can illustrate amounts; only Approve runs money.export_client.
EOF
)"
```

---

### Task 5: Needs-action Ask Orch

**Files:**
- Modify: `apps/web/src/features/notifications/notification-presentation.ts`
- Modify: `apps/web/src/features/notifications/notification-presentation.test.ts` (or `copy.test.ts` on web if that is where CTA tests live — grep `featuredNotificationCta`)
- Modify: `apps/web/src/features/notifications/hooks/use-featured-rail-notification.ts`
- Modify: `apps/web/src/features/workspace-agent/stores/workspace-agent-store.ts` — `seedComposer({ text, toolPreset })`
- Modify: `packages/agent/src/types.ts` — `listMemberAlerts`
- Modify: `packages/agent/src/agency-tools.ts` — `list_member_profile_alerts`
- Modify: `packages/api/src/routers/agent/service.ts` — wrap `listMemberProfileAlerts` for `actorUserId` as subject (self) or payload `subjectUserId` when the actor can manage
- Modify: `packages/agent/src/index.ts` — alert copy

**Interfaces:**
- Consumes: `member.alert` payload (`alertTitle`, `notePreview`, `dateKey`, `alertId`, `subjectUserId`)
- Produces: featured CTA `kind: "ask-orch"`; composer opens in **Plan** with a seeded prompt

- [ ] **Step 1: Write failing presentation test**

Find existing tests beside `notification-presentation.ts`. Add:

```typescript
test("member.alert featured CTA is Ask Orch", () => {
  expect(
    featuredNotificationCta(
      notification({ type: "member.alert", payload: { alertTitle: "Waste spike" } }),
    ),
  ).toEqual({ kind: "ask-orch", label: "Ask Orch" });
});
```

Use the same `notification()` factory the file already uses. If none exists, create `apps/web/src/features/notifications/notification-presentation.test.ts` with a minimal record stub matching `NotificationRecord`.

Also add:

```typescript
export function buildMemberAlertOrchPrompt(input: {
  title: string;
  body: string;
  dateKey?: string;
}): string {
  // tested below
}
```

```typescript
test("seeds a plan prompt that forbids whole-day waste", () => {
  const prompt = buildMemberAlertOrchPrompt({
    title: "Waste spike",
    body: "Three entries look unfocused",
    dateKey: "2026-08-14",
  });
  expect(prompt).toContain("Waste spike");
  expect(prompt).toContain("2026-08-14");
  expect(prompt.toLowerCase()).toContain("targeted");
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/notifications/notification-presentation.test.ts`

- [ ] **Step 3: Implement CTA + seed**

`featuredNotificationCta` for `member.alert`: `{ kind: "ask-orch", label: "Ask Orch" }`.

Extend `FeaturedNotificationCta` union with `"ask-orch"`.

`buildMemberAlertOrchPrompt`:

```typescript
export function buildMemberAlertOrchPrompt(input: {
  title: string;
  body: string;
  dateKey?: string;
}) {
  const dateLine = input.dateKey ? ` Period: ${input.dateKey}.` : "";
  return `Plan a confirmable response to this profile alert: ${input.title}. ${input.body}.${dateLine} Use Agency tools. Suggest only targeted time_entry updates (never a whole day or group). I will Confirm, then Approve.`;
}
```

Store:

```typescript
seedComposer: (input: { text: string; toolPreset: "plan" | "agent" }) => void;
```

implementation: `set({ draft: input.text, expanded: true })` plus the hook sets `selectedToolPreset` to `plan` when it sees a seed flag, **or** pass toolPreset through a small `pendingComposerSeed` field:

```typescript
pendingComposerSeed: { text: string; toolPreset: "plan" | "agent" } | null;
```

Hook: on mount/change, if `pendingComposerSeed`, `setDraft`, `setSelectedToolPreset("plan")`, `setExpanded(true)`, clear seed.

Featured hook `onPrimaryCta` for `ask-orch`: do **not** navigate away first; call `seedComposer`. Inbox Open remains available via overflow.

`list_member_profile_alerts` tool: input `{ userId?: string }` defaulting to the actor. Output titles, kinds, dateKey, entry ids from `context` when present. Ask/Plan/Agent, Agency surface.

Instructions:

```text
Needs-action / member alerts: list_member_profile_alerts, then propose only targeted time_entry.update (for example isWaste on one entryId). Never waste a whole day. Do not send notifications.
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/notifications/notification-presentation.test.ts`
Run: `bun test packages/agent/src/tool-catalog.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/notifications packages/agent/src/types.ts packages/agent/src/agency-tools.ts packages/agent/src/tool-catalog.ts packages/agent/src/tool-catalog.test.ts packages/agent/src/index.ts packages/api/src/routers/agent/service.ts apps/web/src/features/workspace-agent/stores/workspace-agent-store.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts
git commit -m "$(cat <<'EOF'
feat: open Orch Plan from a Needs-action member alert

The featured rail card seeds a confirmable plan instead of silent writes.
EOF
)"
```

---

### Task 6: Tracker existing-task chip

**Files:**
- Modify: `apps/web/src/features/time-tracking/description-suggestions.ts`
- Modify: `apps/web/src/features/time-tracking/description-suggestions.test.ts`
- Modify: `apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts`
- Modify: the tracker description view that already renders the datalist (grep `handleDescriptionSuggestionSelect` / `AgencyDescriptionDatalistField`)

**Interfaces:**
- Consumes: `rankDescriptionDatalistOptions`, current `taskId`
- Produces: `existingTaskSuggestionFromRanked` — `{ taskId, taskTitle, projectId } | null`

Locked: typing never applies the task. Clicking the chip sets project then task (same order as `handleDescriptionSuggestionSelect`) **without** replacing the typed description. Clicking a full description suggestion still uses `draftFromDescriptionSuggestion` (existing).

- [ ] **Step 1: Write failing tests**

```typescript
import { existingTaskSuggestionFromRanked } from "./description-suggestions";

describe("existingTaskSuggestionFromRanked", () => {
  test("returns the first ranked compound with a task different from current", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Landing",
            taskId: "t1",
            taskTitle: "Landing page",
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 2,
            lastUsedAtMs: 1,
          },
        ],
        null,
      ),
    ).toEqual({ taskId: "t1", taskTitle: "Landing page", projectId: "p1" });
  });

  test("returns null when the ranked task is already selected", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Landing",
            taskId: "t1",
            taskTitle: "Landing page",
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 2,
            lastUsedAtMs: 1,
          },
        ],
        "t1",
      ),
    ).toBeNull();
  });

  test("returns null when no ranked row has a task", () => {
    expect(
      existingTaskSuggestionFromRanked(
        [
          {
            description: "Misc",
            taskId: null,
            taskTitle: null,
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            frequency: 1,
            lastUsedAtMs: 1,
          },
        ],
        null,
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/time-tracking/description-suggestions.test.ts`

- [ ] **Step 3: Implement helper + chip**

```typescript
export function existingTaskSuggestionFromRanked(
  options: DescriptionDatalistOption[],
  currentTaskId: string | null,
): { taskId: string; taskTitle: string; projectId: string } | null {
  for (const option of options) {
    if (!option.taskId || !option.taskTitle) continue;
    if (option.taskId === currentTaskId) continue;
    return { taskId: option.taskId, taskTitle: option.taskTitle, projectId: option.projectId };
  }
  return null;
}
```

In `use-agency-time-tracker.ts`, compute from the same `rankDescriptionDatalistOptions` already used for `suggestionBestTaskId`. Pass `existingTaskSuggestion` and `onApplyExistingTaskSuggestion` to the description view.

Chip copy: `Use existing task {taskTitle}`. Button, not an auto-select. Do not add a clear-X on the task chooser.

`suggestionBestTaskId` may keep highlighting the chooser match; it must not write `taskId` on description change.

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/time-tracking/description-suggestions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/time-tracking/description-suggestions.ts apps/web/src/features/time-tracking/description-suggestions.test.ts apps/web/src/features/time-tracking/hooks/use-agency-time-tracker.ts apps/web/src/features/time-tracking
git commit -m "$(cat <<'EOF'
feat: suggest an existing tracker task from similar descriptions

The chip applies only on click so typing never swaps the selected task.
EOF
)"
```

---

### Task 7: Waste copilot on a targeted live-report entry

**Files:**
- Modify: `packages/agent/src/index.ts` (waste rule — already partly in Task 2; tighten)
- Create: `apps/web/src/features/reports/agency-report-orch-waste.ts`
- Create: `apps/web/src/features/reports/agency-report-orch-waste.test.ts`
- Modify: live report row actions (`apps/web/src/features/reports/agency-report-row-actions.tsx` is a view — pass `onAskOrchWaste` from the live report container/hook)

**Interfaces:**
- Consumes: one `entryId` + short label
- Produces: `buildWasteOrchPrompt(entry)` that seeds Agent mode with that entry only

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { buildWasteOrchPrompt } from "./agency-report-orch-waste";

describe("buildWasteOrchPrompt", () => {
  test("names one entry id and forbids whole-day waste", () => {
    const prompt = buildWasteOrchPrompt({
      entryId: "e1",
      description: "Slack",
      durationLabel: "00:12:04",
    });
    expect(prompt).toContain("e1");
    expect(prompt).toContain("Slack");
    expect(prompt).toContain("time_entry.update");
    expect(prompt.toLowerCase()).toContain("only this entry");
    expect(prompt).toContain("isWaste");
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/reports/agency-report-orch-waste.test.ts`

- [ ] **Step 3: Implement prompt + row action**

```typescript
export function buildWasteOrchPrompt(input: {
  entryId: string;
  description: string;
  durationLabel: string;
}) {
  return `Propose time_entry.update isWaste true for only this entry (${input.entryId}, "${input.description}", ${input.durationLabel}). Do not mark other entries, a day, or a group. Then ui_present before/after and wait for Approve.`;
}
```

Live report ⋮ menu: add `Ask Orch` next to Mark as waste. Handler: `seedComposer({ text: buildWasteOrchPrompt(...), toolPreset: "agent" })` using the same store seed as Task 5 (extend seed to accept `"plan" | "agent"`).

Do **not** auto-toggle waste. Existing Mark as waste stays a direct user action.

Instructions already say never whole-day waste; add:

```text
Waste: propose time_entry.update isWaste on a single entryId from get_agency_time_entry. Never a day total or grouped row.
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/reports/agency-report-orch-waste.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reports/agency-report-orch-waste.ts apps/web/src/features/reports/agency-report-orch-waste.test.ts apps/web/src/features/reports/agency-report-row-actions.tsx apps/web/src/features/workspace-agent/stores/workspace-agent-store.ts packages/agent/src/index.ts
git commit -m "$(cat <<'EOF'
feat: ask Orch to propose waste on one report entry

Live report Ask Orch seeds Agent with a single entryId; Approve still required.
EOF
)"
```

---

### Task 8: Verify the slice

- [ ] **Step 1: Tests**

```bash
bun test packages/api/src/routers/agency-ops/time-tracking/time-gaps.test.ts
bun test packages/agent/src/tool-catalog.test.ts
bun test packages/agent/src/agency-actions.test.ts
bun test apps/web/src/features/time-tracking/description-suggestions.test.ts
bun test apps/web/src/features/reports/agency-report-orch-waste.test.ts
```

Expected: PASS

- [ ] **Step 2: Repo checks**

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
```

- [ ] **Step 3: Manual smoke**

1. Agency Ask: "check my time gaps today" → tool + report, no inserts.
2. "insert those" in Agent → proposals with `ui_present`; Approve writes; overlap rejected.
3. "Draft this client's bill for August" as owner → amounts canvas; Approve exports; nothing emailed.
4. Featured member.alert → Ask Orch opens Plan with seeded prompt.
5. Tracker: type a known description → chip appears; typing does not change task; click does.
6. Live report Ask Orch on one row → one `isWaste` proposal.

---

## Out of scope

- Prompt library
- Scraping Cursor/OpenCode/Codex databases inside Orch
- Auto-send invoices or auto-waste a day
- Composer queue/drafts (`2026-08-14-orch-composer-reliability.md`) — Agency seeding **reuses** `seedComposer` from Task 5; if that plan is not done, implement the tiny store seed here (do not block)
