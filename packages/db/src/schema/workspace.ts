import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type {
  WorkspaceMarketplacePayload,
  WorkspaceNode,
} from "@brainiac/workspace";

import { user } from "./auth";

export type WorkspaceNodeRecord = WorkspaceNode;
export type WorkspaceMarketplacePayloadRecord = WorkspaceMarketplacePayload;

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
    index("workspace_marketplace_kind_idx").on(table.kind),
    index("workspace_marketplace_created_at_idx").on(table.createdAt),
  ],
);
