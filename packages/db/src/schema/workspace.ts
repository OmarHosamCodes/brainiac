import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { WorkspaceNode } from "@brainiac/workspace";

import { user } from "./auth";

export type WorkspaceNodeRecord = WorkspaceNode;

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
