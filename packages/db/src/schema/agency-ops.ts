import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type AgencyOpsTimeEntrySource = "timer" | "manual";

export const agencyOpsClient = pgTable(
  "agency_ops_client",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_client_team_idx").on(table.teamId),
    index("agency_ops_client_team_name_idx").on(table.teamId, table.name),
  ],
);

export const agencyOpsProject = pgTable(
  "agency_ops_project",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_team_idx").on(table.teamId),
    index("agency_ops_project_team_client_idx").on(table.teamId, table.clientId),
  ],
);

export const agencyOpsTag = pgTable(
  "agency_ops_tag",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_tag_team_idx").on(table.teamId),
    index("agency_ops_tag_team_name_idx").on(table.teamId, table.name),
  ],
);

export const agencyOpsTimeEntry = pgTable(
  "agency_ops_time_entry",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").$type<AgencyOpsTimeEntrySource>().notNull().default("timer"),
    description: text("description").notNull().default(""),
    linkUrl: text("link_url"),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("agency_ops_time_entry_team_idx").on(table.teamId),
    index("agency_ops_time_entry_team_started_idx").on(table.teamId, table.startedAt),
    index("agency_ops_time_entry_team_project_idx").on(table.teamId, table.projectId),
    index("agency_ops_time_entry_team_user_idx").on(table.teamId, table.userId),
    index("agency_ops_time_entry_user_started_idx").on(table.userId, table.startedAt),
    index("agency_ops_time_entry_team_deleted_idx").on(table.teamId, table.deletedAt),
  ],
);

export const agencyOpsTimeEntryTag = pgTable(
  "agency_ops_time_entry_tag",
  {
    timeEntryId: text("time_entry_id")
      .notNull()
      .references(() => agencyOpsTimeEntry.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => agencyOpsTag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.timeEntryId, table.tagId] }),
    index("agency_ops_time_entry_tag_entry_idx").on(table.timeEntryId),
    index("agency_ops_time_entry_tag_tag_idx").on(table.tagId),
  ],
);

export const agencyOpsActiveTimer = pgTable(
  "agency_ops_active_timer",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    linkUrl: text("link_url"),
    startedAt: timestamp("started_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_active_timer_user_unique").on(table.userId),
    index("agency_ops_active_timer_team_idx").on(table.teamId),
    index("agency_ops_active_timer_team_user_idx").on(table.teamId, table.userId),
  ],
);

export const agencyOpsActiveTimerTag = pgTable(
  "agency_ops_active_timer_tag",
  {
    activeTimerId: text("active_timer_id")
      .notNull()
      .references(() => agencyOpsActiveTimer.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => agencyOpsTag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.activeTimerId, table.tagId] }),
    index("agency_ops_active_timer_tag_timer_idx").on(table.activeTimerId),
    index("agency_ops_active_timer_tag_tag_idx").on(table.tagId),
  ],
);
