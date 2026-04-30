---
title: Layer 4 — Agent API Service (Conversation CRUD + Agent Invocation)
tags: [layer4, agent, service, database, drizzle, conversations, orpc]
---

# Layer 4 — Agent API Service

**Entity:** Agent service functions (6 exported + helpers)  
**Type:** Database Service Module  
**File:** `packages/api/src/routers/agent/service.ts`

## Exported Functions

| Function                          | Signature                                       | Purpose                                                                                                                               |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `listDashboardConversations`      | `(userId: string)`                              | Queries `dashboardConversation` ordered by `updatedAt DESC`, limit 50. Fetches last-message previews via `getConversationPreviewMap`. |
| `getDashboardConversation`        | `(userId, conversationId)`                      | Fetches conversation + all messages ordered `createdAt ASC`. Returns `DashboardConversationDetail`.                                   |
| `createDashboardConversation`     | `(userId, { content, model, toolPreset })`      | Inserts row into `dashboardConversation`, sets title from first 80 chars of content.                                                  |
| `renameDashboardConversation`     | `(userId, conversationId, title)`               | Updates `title` + `updatedAt` on conversation row.                                                                                    |
| `deleteDashboardConversation`     | `(userId, conversationId)`                      | Hard-deletes the conversation row. Returns `{ deleted: true, conversationId }`.                                                       |
| `appendDashboardConversationTurn` | `(userId, userName, input: AgentChatTurnInput)` | Full agent turn: fetch workspace snapshot, run agent, persist messages, update conversation.                                          |

---

## `appendDashboardConversationTurn` — Detailed Flow

```
appendDashboardConversationTurn(userId, userName, input)
  ├─ Parallel:
  │    ├─ input.nodes provided?
  │    │    ├─ yes → use directly as { nodes, updatedAt: null }
  │    │    └─ no  → getWorkspaceSnapshot(userId)    ← workspace service
  │    └─ getWorkspaceMarketplaceItems({ limit: 200, kind: "all" })
  │
  ├─ Conversation lookup/create:
  │    ├─ input.conversationId exists → getConversationRecord(userId, conversationId)
  │    └─ else → createDashboardConversation(userId, { content, model, toolPreset })
  │
  ├─ Fetch last (WINDOW-1) messages from dashboardConversationMessage (DESC, reversed)
  │
  ├─ runDashboardAgent(
  │    [recentMessages..., { role: "user", content }],
  │    { nodes, scopeNodes, marketplaceItems, updatedAt, userName, activeTabId },
  │    { model, toolPreset }
  │  )
  │
  ├─ Compute nextUsageSummary (cumulative totals + latest)
  │
  ├─ result.workspaceSnapshot?
  │    └─ saveWorkspaceNodes(userId, snapshot.nodes)  ← workspace service
  │
  ├─ Insert userMessageRow + assistantMessageRow into dashboardConversationMessage
  │
  └─ Update dashboardConversation: { model, toolPreset, usageSummary, updatedAt, lastMessageAt }
```

---

## Database Tables Used

| Table                          | Operations                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `dashboardConversation`        | `SELECT` (list, get, guard), `INSERT` (create), `UPDATE` (rename, chat turn update), `DELETE`  |
| `dashboardConversationMessage` | `SELECT` (get messages, preview map, recent window), `INSERT` (user + assistant message pairs) |

Both tables are imported from `@brainiac/db/schema`.

---

## Helper Functions

| Function                                                  | Purpose                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `buildConversationTitle(content)`                         | Trims + slices to 80 chars, defaults to "New conversation"            |
| `buildMessagePreview(content)`                            | Normalizes whitespace, slices to 280 chars                            |
| `normalizeConversationUsageSummary(record)`               | Parses persisted usage JSON with defaults                             |
| `buildNextConversationUsageSummary(current, latestUsage)` | Accumulates token + cost totals                                       |
| `mapConversationSummary({ row, lastMessagePreview })`     | Maps DB row → `DashboardConversationSummary`                          |
| `mapConversationMessage(row)`                             | Maps DB row → `DashboardConversationMessage`                          |
| `getConversationRecord(userId, conversationId)`           | Guarded fetch — throws `ORPCError("NOT_FOUND")` if absent or archived |
| `getConversationPreviewMap(conversationIds[])`            | Batch-fetches last message per conversation for list previews         |

---

## Incoming Dependents

| Consumer                            | Mechanism                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/routers/agent.ts` | imports all 5 exported CRUD functions + `appendDashboardConversationTurn` and calls them from procedure handlers |

## Outgoing Dependencies

| Dependency                                  | Mechanism                                                                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@brainiac/agent`                           | imports `runDashboardAgent`, all I/O schemas, constants (`DASHBOARD_CONVERSATION_HISTORY_LIMIT`, `DASHBOARD_CONVERSATION_MESSAGE_WINDOW`, `DASHBOARD_CONVERSATION_TITLE_LIMIT`), `normalizeDashboardAgentToolPreset` |
| `@brainiac/db` (`db`)                       | Drizzle ORM client — executes all SQL queries                                                                                                                                                                        |
| `@brainiac/db/schema`                       | `dashboardConversation`, `dashboardConversationMessage` tables + record types                                                                                                                                        |
| `@brainiac/workspace` (`createWorkspaceId`) | generates `"conversation"` and `"message"` prefixed IDs                                                                                                                                                              |
| `./workspace/service`                       | calls `getWorkspaceSnapshot`, `getWorkspaceMarketplaceItems`, `saveWorkspaceNodes`                                                                                                                                   |
| `@orpc/server` (`ORPCError`)                | throws `NOT_FOUND` in `getConversationRecord`                                                                                                                                                                        |
| `drizzle-orm`                               | `and`, `asc`, `desc`, `eq`, `inArray`, `isNull` query builders                                                                                                                                                       |

## Standalone Status

Not standalone — depends on `@brainiac/agent`, `@brainiac/db`, `@brainiac/workspace`, the workspace service, and `drizzle-orm`.
