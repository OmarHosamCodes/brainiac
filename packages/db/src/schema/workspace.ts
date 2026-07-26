import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { WorkspaceMarketplacePayload, WorkspaceNode } from "@orch/workspace";

import { user } from "./auth";

export type WorkspaceNodeRecord = WorkspaceNode;
export type WorkspaceMarketplacePayloadRecord = WorkspaceMarketplacePayload;
export type DashboardConversationMessageContextNodeTitlesRecord = string[];
export type DashboardConversationMessageToolCallRecord = {
  id?: string;
  name: string;
  input?: unknown;
  output?: unknown;
  status?: "completed" | "error" | "in_progress";
  error?: string | null;
  durationMs?: number;
};
export type DashboardConversationMessageToolsCalledRecord = Array<
  string | DashboardConversationMessageToolCallRecord
>;
export type DashboardConversationMessageAttachmentRecord = {
  filename: string;
  mediaType:
    | "text/plain"
    | "text/markdown"
    | "application/json"
    | "image/png"
    | "image/jpeg"
    | "image/webp"
    | "image/gif";
  text: string;
};
export type DashboardConversationUsageLatestRecord = {
  modelId: string;
  contextLength: number | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number | null;
};
export type DashboardConversationUsageTotalsRecord = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
};
export type DashboardConversationUsageSummaryRecord = {
  latest: DashboardConversationUsageLatestRecord | null;
  totals: DashboardConversationUsageTotalsRecord;
};

const EMPTY_DASHBOARD_CONVERSATION_USAGE_SUMMARY_RECORD: DashboardConversationUsageSummaryRecord = {
  latest: null,
  totals: {
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costUsd: 0,
  },
};

export const dashboardWorkspace = pgTable("dashboard_workspace", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<WorkspaceNodeRecord[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const workspaceMarketplaceItem = pgTable(
  "workspace_marketplace_item",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<WorkspaceMarketplacePayloadRecord>().notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_marketplace_item_kind_idx").on(table.kind),
    index("workspace_marketplace_item_created_at_idx").on(table.createdAt),
  ],
);

export const dashboardConversation = pgTable(
  "dashboard_conversation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    model: text("model"),
    toolPreset: text("tool_preset").notNull(),
    usageSummary: jsonb("usage_summary")
      .$type<DashboardConversationUsageSummaryRecord>()
      .notNull()
      .default(EMPTY_DASHBOARD_CONVERSATION_USAGE_SUMMARY_RECORD),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("dashboard_conversation_user_updated_idx").on(table.userId, table.updatedAt),
    index("dashboard_conversation_user_last_message_idx").on(table.userId, table.lastMessageAt),
  ],
);

export const dashboardConversationMessage = pgTable(
  "dashboard_conversation_message",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => dashboardConversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    attachments: jsonb("attachments")
      .$type<DashboardConversationMessageAttachmentRecord[]>()
      .notNull()
      .default([]),
    contextNodeTitles: jsonb("context_node_titles")
      .$type<DashboardConversationMessageContextNodeTitlesRecord>()
      .notNull()
      .default([]),
    model: text("model"),
    toolsCalled: jsonb("tools_called")
      .$type<DashboardConversationMessageToolsCalledRecord>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dashboard_conversation_message_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("dashboard_conversation_message_user_created_idx").on(table.userId, table.createdAt),
  ],
);
