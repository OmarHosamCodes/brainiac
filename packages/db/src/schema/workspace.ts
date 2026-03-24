import { user } from "./auth";

import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export type WorkspaceNodeRecord = {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  minWidth?: number;
  minHeight?: number;
  createdAt: string;
  updatedAt: string;
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
