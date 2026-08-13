# Assistant-ui Composer Revamp Implementation Plan

**Goal:** Install every website-capable `@assistant-ui` registry item and wire them into the live Orch composer/thread in one slice. Expanded chat is assistant-ui `Thread`. Collapsed Orch pill stays the global entry. Stream stays `agent.chat.turnStream` via a custom transport. No `/api/chat`, no Next.js pages.

**Spec:** `docs/superpowers/specs/2026-08-13-assistant-ui-composer-revamp-design.md`

## Constraints

- Bun only. Golden layers. Web imports `@orch/agent/types`, never the agent barrel.
- Do not overwrite `@/ui`. Assistant-ui primitives stay in `apps/web/src/components/assistant-ui/`.
- Do not install/mount: local computer-use, Eve chat, Next.js backend/quick-start pages, Chrome AI.
- Install but do not mount as launchers: `assistant-modal`, `launcher-bubble`.
- No new DB migration. Mapper adapts existing `AgentChatTurnStreamEvent`.
- Voice/MCP/code-runner: UI only (empty/disconnected).

## Tasks

- [x] Add `@assistant-ui` registry to `apps/web/components.json` and install website-capable items.
- [x] Catalog constants + guard test (include/exclude/unmounted launchers).
- [x] Keep/extend event mapper tests; add empty-submit and retry-same-conversation tests.
- [x] Rewrite `orch-turn-stream-transport.ts` as the assistant-ui/AI-SDK runtime transport (`reconnectToStream` = null).
- [x] `useWorkspaceAgent` owns one `AssistantRuntime` (`useChatRuntime` / `useAISDKRuntime` over existing oRPC stream). Drop direct `useChat` from the feature API.
- [x] `chat-panel-view` becomes Thread host: thread, scroll-anchor, empty-state, history bill ThreadList, sticky dock overlay.
- [x] Register website-capable elements as Thread/composer parts (HITL → approval/elicitation; artifacts → generative-ui; tools → tool-\*).
- [x] Keep collapsed pill chrome; bind send/stop/draft to the same runtime.
- [ ] `bun run check` · `check-types` · `check:conventions` · `check:golden` · mapper tests.

## Done when

Pill expands to Thread, send streams through oRPC, stop keeps partial, proposals/questions/artifacts still render, catalog guard passes, checks pass.
