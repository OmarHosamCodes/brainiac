# Orch Thread Search and Read-Aloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search saved Orch threads in the history rail, find text in the open conversation, and read the latest assistant message aloud with one control.

**Architecture:** Reuse installed presentational elements (`ThreadSearch`, `ConversationSearch`). Filtering and hit extraction are pure helpers next to the feature. Read-aloud uses the Web Speech API (`speechSynthesis`) behind a tiny wrapper — do not mount the full `ReadAloud` paper demo as always-on chrome. History rail stays inside the expanded Thread card; the collapsed pill stays the only global entry.

**Tech Stack:** Bun, React 19, assistant-ui Thread host, Web Speech API.

## Global Constraints

- Bun only. Golden views are props-only.
- Browser: `@orch/agent/types`, never `@orch/agent` barrel.
- No `/api/chat`. No Voice/MCP/quota/runner demos. No Prompt library.
- Do not persist search query in `localStorage`.
- Read-aloud is optional and local; no new backend.
- Tests: co-located `bun:test`. No component render tests.
- `bun run check`, `check-types`, `check:conventions`, `check:golden` before finish.

## File map

| File                                                                           | Responsibility                                     |
| ------------------------------------------------------------------------------ | -------------------------------------------------- |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-filter.ts`       | Filter history threads by title/preview            |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts`  | Filter tests                                       |
| `apps/web/src/features/workspace-agent/workspace-agent-message-search.ts`      | Find hits in current messages                      |
| `apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts` | Hit tests                                          |
| `apps/web/src/features/workspace-agent/workspace-agent-read-aloud.ts`          | Split words + wrap speechSynthesis                 |
| `apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts`     | Word split tests                                   |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-history.tsx`     | Mount `ThreadSearch`                               |
| `apps/web/src/features/workspace-agent/chat-panel-view.tsx`                    | Mount in-thread `ConversationSearch`; pass preview |
| `apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx`       | Read-aloud icon on assistant messages              |
| `apps/web/src/components/elements/thread-search.tsx`                           | Installed (do not restyle)                         |
| `apps/web/src/components/elements/conversation-search.tsx`                     | Installed (do not restyle)                         |
| `apps/web/src/components/elements/read-aloud.tsx`                              | Do not mount as persistent chrome                  |

---

### Task 1: History thread filter helper

**Files:**

- Create: `apps/web/src/features/workspace-agent/workspace-agent-thread-filter.ts`
- Test: `apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts`

**Interfaces:**

- Consumes: `{ id, label, preview, stamp }` conversation options
- Produces: `filterWorkspaceAgentThreads(threads, query)`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { filterWorkspaceAgentThreads } from "./workspace-agent-thread-filter";

const threads = [
  { id: "1", label: "August hours", preview: "Paid vs waste", stamp: "2026-08-14" },
  { id: "2", label: "Canvas brief", preview: "Hero block", stamp: "2026-08-13" },
];

describe("filterWorkspaceAgentThreads", () => {
  test("returns all threads for an empty query", () => {
    expect(filterWorkspaceAgentThreads(threads, "  ")).toEqual(threads);
  });

  test("matches title or preview case-insensitively", () => {
    expect(filterWorkspaceAgentThreads(threads, "waste").map((t) => t.id)).toEqual(["1"]);
    expect(filterWorkspaceAgentThreads(threads, "CANVAS").map((t) => t.id)).toEqual(["2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts`
Expected: FAIL module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
export type WorkspaceAgentThreadFilterItem = {
  id: string;
  label: string;
  preview: string;
  stamp: string;
};

export function filterWorkspaceAgentThreads<T extends WorkspaceAgentThreadFilterItem>(
  threads: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...threads];
  return threads.filter((thread) =>
    `${thread.label} ${thread.preview}`.toLowerCase().includes(needle),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-thread-filter.ts apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts
git commit -m "$(cat <<'EOF'
feat: filter Orch history threads by title and preview

History search is a pure substring match so the rail can reuse ThreadSearch.
EOF
)"
```

---

### Task 2: Mount ThreadSearch in the history rail

**Files:**

- Modify: `apps/web/src/features/workspace-agent/chat-panel-view.tsx` (`WorkspaceAgentConversationOption` add `preview: string`)
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts` (map list API preview onto options)
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-history.tsx`

**Interfaces:**

- Consumes: `filterWorkspaceAgentThreads`; installed `ThreadSearch`
- Produces: history rail search box; selecting a row still calls `onSelectConversation`

Inspect `listDashboardConversations` / conversation option mapping in `use-workspace-agent.ts`. If the list payload already has a preview string, pass it through. If not, use `label` as `preview` (empty string is fine).

- [ ] **Step 1: Extend the filter test for empty preview**

```typescript
test("still matches title when preview is empty", () => {
  expect(
    filterWorkspaceAgentThreads(
      [{ id: "3", label: "Gap fill", preview: "", stamp: "" }],
      "gap",
    ).map((t) => t.id),
  ).toEqual(["3"]);
});
```

- [ ] **Step 2: Run test**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts`
Expected: PASS after Task 1 implementation (this is an extra case)

- [ ] **Step 3: Wire the rail**

Add `preview: string` to `WorkspaceAgentConversationOption`.

In `WorkspaceAgentThreadHistory`:

```tsx
import { useState } from "react";
import { ThreadSearch } from "@/components/elements/thread-search";
import { filterWorkspaceAgentThreads } from "@/features/workspace-agent/workspace-agent-thread-filter";

const [historyQuery, setHistoryQuery] = useState("");
const filtered = filterWorkspaceAgentThreads(
  conversationOptions.map((conversation) => ({
    id: conversation.id,
    label: conversation.label,
    preview: conversation.preview,
    stamp: conversation.stamp,
  })),
  historyQuery,
);
```

`WorkspaceAgentThreadHistory` is a `*-history.tsx` file, not `*-view.tsx`. If conventions treat it as a view, lift `useState` into `use-workspace-agent.ts` (`historyQuery` / `setHistoryQuery`) and keep this file props-only.

Prefer lifting state into the hook so the history file stays presentational:

Props: `historyQuery`, `onHistoryQueryChange`, plus existing conversation props.

Render `ThreadSearch` above the list (not instead of `ThreadList`):

```tsx
<ThreadSearch
  className="max-w-none px-2 pt-2"
  query={historyQuery}
  activeId={activeConversationId ?? ""}
  threads={conversationOptions.map((conversation) => ({
    id: conversation.id,
    title: conversation.label,
    group: "",
    preview: conversation.preview,
  }))}
  onQueryChange={onHistoryQueryChange}
  onSelect={onSelectConversation}
/>
```

`ThreadSearch` already filters internally. You may either:

- Pass **all** threads into `ThreadSearch` and drop the duplicate `ThreadList` when `historyQuery` is non-empty, or
- Keep `ThreadList` and hide `ThreadSearch`'s result list by not using ThreadSearch's list — **do not duplicate two lists**.

Locked: when `historyQuery.trim()` is non-empty, show only `ThreadSearch` results. When empty, show the existing `ThreadList` (rename/delete stay on that list). Search results `onSelect` switches conversation; rename/delete remain on the unfiltered list when query is empty.

- [ ] **Step 4: Types**

Run: `bun run check-types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/chat-panel-view.tsx apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-history.tsx
git commit -m "$(cat <<'EOF'
feat: search Orch chat history in the thread rail

ThreadSearch filters saved conversations without adding a second chat stack.
EOF
)"
```

---

### Task 3: In-conversation hit extraction

**Files:**

- Create: `apps/web/src/features/workspace-agent/workspace-agent-message-search.ts`
- Test: `apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts`

**Interfaces:**

- Consumes: `OrchUIMessage[]` text (join text parts)
- Produces: `SearchHit[]` compatible with `ConversationSearch` (`id`, `before`, `match`, `after`, `position`)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from "bun:test";

import { findWorkspaceAgentMessageHits } from "./workspace-agent-message-search";

describe("findWorkspaceAgentMessageHits", () => {
  test("returns no hits for empty query", () => {
    expect(findWorkspaceAgentMessageHits("Paid waste internal", "")).toEqual([]);
  });

  test("extracts before/match/after for the first hit", () => {
    const hits = findWorkspaceAgentMessageHits("Paid waste internal", "waste");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.match.toLowerCase()).toBe("waste");
    expect(hits[0]?.before.endsWith("Paid ")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts`

- [ ] **Step 3: Implement**

```typescript
export type WorkspaceAgentMessageSearchHit = {
  id: string;
  before: string;
  match: string;
  after: string;
  position: number;
};

const CONTEXT = 24;

export function findWorkspaceAgentMessageHits(
  haystack: string,
  query: string,
): WorkspaceAgentMessageSearchHit[] {
  const needle = query.trim();
  if (!needle) return [];
  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const hits: WorkspaceAgentMessageSearchHit[] = [];
  let from = 0;
  while (from < haystack.length) {
    const position = lowerHay.indexOf(lowerNeedle, from);
    if (position === -1) break;
    hits.push({
      id: `hit-${position}`,
      before: haystack.slice(Math.max(0, position - CONTEXT), position),
      match: haystack.slice(position, position + needle.length),
      after: haystack.slice(position + needle.length, position + needle.length + CONTEXT),
      position,
    });
    from = position + Math.max(needle.length, 1);
  }
  return hits;
}

export function joinOrchMessageText(
  messages: Array<{ parts?: Array<{ type: string; text?: string }> }>,
) {
  return messages
    .flatMap((message) => message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-message-search.ts apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts
git commit -m "$(cat <<'EOF'
feat: extract find-in-thread hits from Orch messages

ConversationSearch needs before/match/after slices, not DOM scraping.
EOF
)"
```

---

### Task 4: Mount ConversationSearch in the expanded thread

**Files:**

- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`
- Modify: `apps/web/src/features/workspace-agent/chat-panel-view.tsx`

**Interfaces:**

- Consumes: `findWorkspaceAgentMessageHits`, `joinOrchMessageText`, `ConversationSearch`
- Produces: `threadSearchQuery`, `threadSearchHits`, `threadSearchIndex`, `onThreadSearchQueryChange`, `onThreadSearchStep`

- [ ] **Step 1: Add a wrap-around step test**

```typescript
import { stepSearchIndex } from "./workspace-agent-message-search";

describe("stepSearchIndex", () => {
  test("wraps within hit count", () => {
    expect(stepSearchIndex({ index: 0, count: 3, delta: -1 })).toBe(2);
    expect(stepSearchIndex({ index: 2, count: 3, delta: 1 })).toBe(0);
    expect(stepSearchIndex({ index: 0, count: 0, delta: 1 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts`

- [ ] **Step 3: Implement step helper and UI**

```typescript
export function stepSearchIndex(input: { index: number; count: number; delta: number }) {
  if (input.count <= 0) return 0;
  return (input.index + input.delta + input.count) % input.count;
}
```

Hook owns query/index. `chat-panel-view.tsx` is presentational: render `ConversationSearch` in the history/header row of the expanded thread (top of the Thread column, not over the collapsed pill):

```tsx
import { ConversationSearch } from "@/components/elements/conversation-search";

{
  threadSearchOpen ? (
    <ConversationSearch
      className="max-w-none px-3 py-2"
      query={threadSearchQuery}
      hits={threadSearchHits}
      activeIndex={threadSearchIndex}
      onQueryChange={onThreadSearchQueryChange}
      onStep={onThreadSearchStep}
    />
  ) : null;
}
```

Add a quiet search icon button next to New chat / history that toggles `threadSearchOpen`. Keyboard: when expanded, `Mod+F` focuses find-in-thread (do not steal browser find if you cannot preventDefault reliably — toggle our bar and focus its input).

Do not scroll-highlight via DOM tests; stepping updates `activeIndex` and the hit preview in `ConversationSearch` is enough for this slice.

- [ ] **Step 4: Run tests + types**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts`
Then: `bun run check-types`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-message-search.ts apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/chat-panel-view.tsx
git commit -m "$(cat <<'EOF'
feat: find text in the open Orch thread

ConversationSearch steps through hits in the current messages without a second stack.
EOF
)"
```

---

### Task 5: Read-aloud for the latest assistant message

**Files:**

- Create: `apps/web/src/features/workspace-agent/workspace-agent-read-aloud.ts`
- Test: `apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts`
- Modify: `apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx`
- Modify: `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`

**Interfaces:**

- Consumes: last assistant text; `window.speechSynthesis` in the hook only
- Produces: `splitReadAloudWords`, `onToggleReadAloud`, `readAloudPlaying`

Do **not** mount `ReadAloud` as a persistent paper card. One icon button (Volume2) on the last assistant message. If `speechSynthesis` is missing, hide the button.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";

import { splitReadAloudWords } from "./workspace-agent-read-aloud";

describe("splitReadAloudWords", () => {
  test("splits on whitespace and drops empties", () => {
    expect(splitReadAloudWords("  Paid  waste ")).toEqual(["Paid", "waste"]);
  });

  test("returns empty for blank text", () => {
    expect(splitReadAloudWords("   ")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts`

- [ ] **Step 3: Implement**

```typescript
export function splitReadAloudWords(text: string) {
  return text.split(/\s+/).filter(Boolean);
}
```

Hook (orchestration, not the view):

```typescript
const [readAloudPlaying, setReadAloudPlaying] = useState(false);

const stopReadAloud = useCallback(() => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  setReadAloudPlaying(false);
}, []);

const toggleReadAloud = useCallback(() => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (readAloudPlaying) {
    stopReadAloud();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(lastAssistantText);
  utterance.onend = () => setReadAloudPlaying(false);
  utterance.onerror = () => setReadAloudPlaying(false);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setReadAloudPlaying(true);
}, [lastAssistantText, readAloudPlaying, stopReadAloud]);
```

Stop speech when `activeConversationId` changes and when the panel collapses.

View: a `Button` variant ghost size icon, `aria-label={readAloudPlaying ? "Stop reading" : "Read aloud"}`, only if `readAloudSupported`. Tooltip: "Read aloud".

- [ ] **Step 4: Run tests**

Run: `bun test apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-agent/workspace-agent-read-aloud.ts apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts apps/web/src/features/workspace-agent/workspace-agent-thread-slots.tsx
git commit -m "$(cat <<'EOF'
feat: read the latest Orch answer aloud

One Web Speech control on the assistant message; no second voice chrome.
EOF
)"
```

---

### Task 6: Verify the slice

- [ ] **Step 1: Tests**

```bash
bun test apps/web/src/features/workspace-agent/workspace-agent-thread-filter.test.ts
bun test apps/web/src/features/workspace-agent/workspace-agent-message-search.test.ts
bun test apps/web/src/features/workspace-agent/workspace-agent-read-aloud.test.ts
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

1. Expand Orch, search history for a known title, click a result.
2. Mod+F / search icon: type a word from the thread; next/prev updates the hit chip.
3. Read aloud plays and the icon toggles to stop; switching threads cancels speech.

---

## Out of scope

- Prompt library
- Composer queue / drafts / `@` / Continue / Pro effort (`2026-08-14-orch-composer-reliability.md`)
- Agency and Canvas write tools
