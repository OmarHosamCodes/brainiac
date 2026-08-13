# Assistant-ui Composer Revamp

Date: 2026-08-13
Status: Approved — implementation complete

## Feature summary

Revamp the Orch workspace agent frontend and backend around the `@assistant-ui`
shadcn registry. Install every website-capable registry item and wire it into the
live product in one slice. Expanded chat becomes assistant-ui `Thread`. The
collapsed Orch pill stays the only global entry. The backend stays Hono/oRPC
`agent.chat.turnStream`; a custom assistant-ui transport maps those events into
the Thread runtime. No parallel `/api/chat`. No Next.js route handlers.

## Locked decisions

- Catalog: option A, website-only. Install and wire every `@assistant-ui` item
  that can run in a browser. Exclude local computer-use, Chrome-only on-device
  AI, Eve-specific `eve-chat`, and Next.js pages.
- Shell: option C hybrid. Expanded chat is `Thread`. Collapsed Orch pill remains
  the global entry (hover-expand, Working… shimmer, mode tags, Fast/Balanced/Pro,
  plus-menu attach, floating history bill).
- Backend: option A. Keep `agent.chat.turnStream` as the only stream. Custom
  assistant-ui transport replaces `OrchTurnStreamTransport` + `@ai-sdk/react`
  `useChat`.
- Delivery: one mega-slice. Install, transport, Thread, and every in-scope
  element are wired before this ships.
- Duplicate primitives (`badge`, `tabs`, `accordion`, `select`) land under
  `apps/web/src/components/assistant-ui/`. Do not overwrite `@/ui`.
- `assistant-modal` and `launcher-bubble` are installed, not mounted as extra
  launchers.
- Voice conversation, MCP OAuth, and code-sandbox backends are out of scope.
  Their UIs mount in empty/disconnected/client-only states. Read-aloud uses Web
  Speech. Maps render when a tool result has coordinates.
- `reconnectToStream` is `null`. Reload hydrates from `conversations.get`.

## Non-goals

- Local OS computer-use of the user’s machine.
- Chrome-only on-device model runtime.
- Copying Next.js `ai-sdk-backend`, resumable route, or quick-start pages.
- A second chat protocol or `/api/chat` AI SDK endpoint.
- New voice-realtime, MCP OAuth, or code-sandbox services.
- Overwriting shadcn `@/ui` primitives.
- Liquid-glass composer chrome.
- Changing Ask / Plan / Agent semantics, proposal HITL, or Agency/Canvas catalog
  unlock rules.

## Architecture

**Install.** Add `@assistant-ui` to `apps/web/components.json` with the
style-aware registry URL for `radix-rhea`:

```json
"@assistant-ui": "https://r.assistant-ui.com/styles/{style}/{name}.json"
```

Pull every website-capable item into `apps/web/src/components/assistant-ui/`.
Inject shimmer / generative-ui styles into `apps/web/src/index.css`. Use
`bunx --bun shadcn@latest`.

**Runtime.** One `AssistantRuntimeProvider` for the expanded `Thread`. The
collapsed pill is a client of that same runtime (draft, attachments, send,
stop). There is no second message list.

**Layers.** Golden file pattern holds:

```text
oRPC agent routers/services
  -> feature store / queries
  -> useWorkspaceAgent (runtime + transport + view model)
  -> container
  -> views (Orch pill + Thread wrappers)
```

Views do not call oRPC, TanStack Query, or stores. Browser code must not import
the `@orch/agent` barrel; use `@orch/agent/types` or `@orch/agent/model-routing`.

**Orch behavior that must survive.** Unified Agency + Canvas composer; Ask /
Plan / Agent on both; writes only via pending proposals with before/after
`ui_present`; route-default tool catalog plus scope/intent unlock; sticky
question / plan / canvas dock; Fast/Balanced/Pro with Auto and Free; plus-menu
attachments; morphing pill expand/collapse.

## Components

### Collapsed (keep Orch)

Current pill in `workspace-agent-view.tsx` / `composer-view.tsx` stays the only
global entry. It binds to the assistant-ui runtime instead of `useChat`.

### Expanded (replace chat panel)

`WorkspaceAgentChatPanelView` is replaced by assistant-ui `Thread`:

| Role         | Registry items                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shell        | `thread`, `scroll-anchor`, `empty-state`, `onboarding`                                                                                                                                                             |
| History bill | `thread-list`, `thread-search`, `conversation-search`                                                                                                                                                              |
| Composer     | `elements-composer`, `mobile-composer`, `composer-trigger-popover`, `attachment`, `draft-restore`, `message-queue`                                                                                                 |
| Messages     | streaming/markdown/reasoning/actions/branches/edit/quote/regenerate/timing/error/stopped/guardrail/day-separator/speaker                                                                                           |
| Tools        | `tool-call`, `tool-group`, `tool-timeline`, `tool-fallback`, `tool-error`, terminal, diffs, file-tree                                                                                                              |
| HITL         | `approval-card`, `recommendation-card`, `elicitation-form`, `feedback-dialog`, `permission-grant`                                                                                                                  |
| Artifacts    | `artifact-card`, `canvas-split`, `web-preview`, `generative-ui`, sources, image, file, charts, tables, mermaid, maps, math                                                                                         |
| Extras       | `model-selector` / `model-picker` / `reasoning-effort` under Fast/Balanced/Pro; cost/context/quota; suggestions; prompt library; command palette; settings; voice + read-aloud; MCP panel; code-runner empty state |

Sticky question/plan/canvas dock remains a Thread overlay, not a second scroller.
`ui_present` (including `workspaceBlock` / `workspaceNode`) renders through
generative-ui / artifact parts and the existing board block registry.

### Exclude from live mount

- `elements-computer-use` (local machine)
- Chrome AI runtime
- `eve-chat`
- Next.js pages: `ai-sdk-backend`, `ai-sdk-backend-resumable`,
  `chat/b/ai-sdk-quick-start/json`
- `assistant-modal`, `launcher-bubble` as global launchers (installed only)

All other registry items are installed and wired into Thread or composer chrome.

## Data flow

1. Pill or Thread composer → runtime `append` with Orch extras in transport body:
   `toolPreset`, `surface`, `scope`, model tier/auto/free, `attachments`,
   `teamId`, `conversationId`.
2. Custom transport calls `streamAgentChatTurn` → oRPC `agent.chat.turnStream`.
3. Each `AgentChatTurnStreamEvent` maps to runtime updates: text, reasoning,
   tool start/args/result/error, plan/question/proposal/artifact data parts,
   `orchMeta` / `orchCompleted`, abort.
4. `conversations.get` hydrates history into assistant-ui messages, including
   data parts so HITL cards and artifacts restore.
5. Thread list uses `conversations.list` / rename / delete.
6. HITL cards call existing `proposals.confirmPlan` / `approve` / `reject` and
   question-answer append. They never execute writes from the Thread.
7. Route plus scope chips still decide `tools.catalog`. Mentions (`@`) go through
   `composer-trigger-popover` into the existing scope-chip model.
8. Zustand keeps pill chrome only (expanded, draft mirror, menus, scope mode).
   Messages, status, and composer attachments live in the assistant-ui runtime.

Empty text with no attachments is rejected before the network. Send while a run
is in flight uses `message-queue`.

Conversation persistence and `AgentChatTurnStreamEvent` shapes stay as they are.
This spec adds no database migration. The mapper is the adapter. If an existing
event cannot map, extend the mapper — do not add a second event protocol.

## Error handling

- Stream/network: `elements-error-state` + `elements-connection-state`. Partial
  assistant text stays. Retry resends the same turn; it does not create a new
  conversation. Views receive display-ready strings.
- Stop: abort the oRPC signal. `elements-stopped-run` keeps the partial answer
  and offers continue as one new turn on the same thread. Stop is visible and
  accessible. Queued lines remain cancelable.
- No reconnect: `reconnectToStream` is `null`. Reload hydrates from
  `conversations.get`. `connection-state` must not imply a live tail.
- Tools: `tool-error` with retry only for read-safe tools. Write tools never
  auto-retry; they go through approval cards. Guardrails use `guardrail-notice`.
- HITL: approve/reject/confirm-plan failures toast bottom-right and leave the
  card pending. Question submit failures keep the form open.
- Attachments: oversize/unsupported toast and stay off the turn.
- Quota: `quota-banner` from account status, not a thrown stream error.
- Voice/MCP/runner: disconnected empty states, not error toasts.
- Auth: existing `protectedProcedure` + `requireTeamMembership`. 401/403 are not
  rendered as model failures.

## Testing

Pure Bun tests only. No DOM or Playwright component tests for registry files.

**Must add**

- Transport mapper: each `AgentChatTurnStreamEvent` → runtime update.
- Persisted messages → Thread messages, including plan/proposal/question/artifact
  parts.
- Empty submit rejected; stop/abort; retry does not create a new conversation.
- Catalog guard: website-capable vs exclude set; `assistant-modal` /
  `launcher-bubble` stay unmounted.

**Must keep / update**

- `orch-ui-message`, `agent-turn-stream`, attachments, sticky-dock, stream-events,
  `stream.integration`, proposal, and conversation-contract tests.

**Done bar (implementation + validation loop)**

```bash
bun run check
bun run check-types
bun run check:conventions
bun run check:golden
bun test <touched mapper / agent files>
```

Manual browser pass: pill → expand → send → stop → proposal card → sticky dock.

## File map (expected)

| Area                     | Location                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Registry source          | `apps/web/src/components/assistant-ui/`                                                                           |
| Feature wrappers / views | `apps/web/src/features/workspace-agent/`                                                                          |
| Runtime hook             | `apps/web/src/features/workspace-agent/hooks/use-workspace-agent.ts`                                              |
| Custom transport         | `apps/web/src/features/workspace-agent/orch-turn-stream-transport.ts` (rewrite as assistant-ui runtime transport) |
| Stream + persistence     | `packages/api/src/routers/agent/` + `packages/agent/`                                                             |
| Styles                   | `apps/web/src/index.css`                                                                                          |
| Registry config          | `apps/web/components.json`                                                                                        |

`chat-panel-view` becomes the Thread host (rename allowed; do not keep a second
message list). Keep collapsed pill chrome in `workspace-agent-view` /
`composer-view`. Remove `@/components/ai-elements` usage once Thread composer
and tool parts are wired.

## Risks

- Mega-slice PR size. Mitigate with mapper tests and the file-watch validation
  loop (`check` / `check-types` / `check:conventions` on every relevant change).
- assistant-ui runtime vs Orch data parts. Mapper must be exhaustive for existing
  `OrchUIDataParts`.
- Two composer UIs (pill vs Thread composer) sharing one runtime. Draft and
  attachments must not fork.
- Importing `@orch/agent` from Vite. Keep types-only imports on the web.
