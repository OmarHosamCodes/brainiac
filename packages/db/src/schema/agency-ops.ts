import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type AgencyOpsClientStatus = "active" | "archived";
export type AgencyOpsProjectStatus = "planning" | "active" | "paused" | "completed";
export type AgencyOpsSprintStatus = "planned" | "active" | "completed";
export type AgencyOpsSprintItemStatus = "todo" | "doing" | "done";
export type AgencyOpsSprintItemType = "task" | "step";
export type AgencyOpsTimeEntrySource = "timer" | "manual";

export const agencyOpsClient = pgTable(
    "agency_ops_client",
    {
        id: text("id").primaryKey(),
        teamId: text("team_id")
            .notNull()
            .references(() => workspaceTeam.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        brandColor: text("brand_color").notNull().default("#2563eb"),
        status: text("status").$type<AgencyOpsClientStatus>().notNull().default("active"),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        archivedAt: timestamp("archived_at"),
    },
    (table) => [
        index("agency_ops_client_team_idx").on(table.teamId),
        index("agency_ops_client_team_status_idx").on(table.teamId, table.status),
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
        description: text("description").notNull().default(""),
        status: text("status").$type<AgencyOpsProjectStatus>().notNull().default("planning"),
        budgetMinutes: integer("budget_minutes").notNull().default(0),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        archivedAt: timestamp("archived_at"),
    },
    (table) => [
        index("agency_ops_project_team_idx").on(table.teamId),
        index("agency_ops_project_team_client_idx").on(table.teamId, table.clientId),
        index("agency_ops_project_team_status_idx").on(table.teamId, table.status),
        index("agency_ops_project_team_archived_idx").on(table.teamId, table.archivedAt),
    ],
);

export const agencyOpsSprint = pgTable(
    "agency_ops_sprint",
    {
        id: text("id").primaryKey(),
        teamId: text("team_id")
            .notNull()
            .references(() => workspaceTeam.id, { onDelete: "cascade" }),
        projectId: text("project_id")
            .notNull()
            .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        status: text("status").$type<AgencyOpsSprintStatus>().notNull().default("planned"),
        startDate: timestamp("start_date"),
        endDate: timestamp("end_date"),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        completedAt: timestamp("completed_at"),
    },
    (table) => [
        index("agency_ops_sprint_team_idx").on(table.teamId),
        index("agency_ops_sprint_team_project_idx").on(table.teamId, table.projectId),
        index("agency_ops_sprint_team_status_idx").on(table.teamId, table.status),
        index("agency_ops_sprint_team_dates_idx").on(table.teamId, table.startDate, table.endDate),
    ],
);

export const agencyOpsSprintItem = pgTable(
    "agency_ops_sprint_item",
    {
        id: text("id").primaryKey(),
        teamId: text("team_id")
            .notNull()
            .references(() => workspaceTeam.id, { onDelete: "cascade" }),
        projectId: text("project_id")
            .notNull()
            .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
        sprintId: text("sprint_id")
            .notNull()
            .references(() => agencyOpsSprint.id, { onDelete: "cascade" }),
        type: text("type").$type<AgencyOpsSprintItemType>().notNull().default("task"),
        title: text("title").notNull(),
        description: text("description").notNull().default(""),
        status: text("status").$type<AgencyOpsSprintItemStatus>().notNull().default("todo"),
        assigneeUserId: text("assignee_user_id").references(() => user.id, { onDelete: "set null" }),
        estimateMinutes: integer("estimate_minutes").notNull().default(30),
        position: integer("position").notNull().default(0),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        archivedAt: timestamp("archived_at"),
    },
    (table) => [
        index("agency_ops_sprint_item_team_idx").on(table.teamId),
        index("agency_ops_sprint_item_team_sprint_idx").on(table.teamId, table.sprintId),
        index("agency_ops_sprint_item_team_status_idx").on(table.teamId, table.status),
        index("agency_ops_sprint_item_team_assignee_idx").on(table.teamId, table.assigneeUserId),
        index("agency_ops_sprint_item_sprint_position_idx").on(table.sprintId, table.position),
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
        sprintId: text("sprint_id")
            .references(() => agencyOpsSprint.id, { onDelete: "set null" }),
        sprintItemId: text("sprint_item_id")
            .notNull()
            .references(() => agencyOpsSprintItem.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        source: text("source").$type<AgencyOpsTimeEntrySource>().notNull().default("timer"),
        description: text("description").notNull().default(""),
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
        sprintId: text("sprint_id")
            .references(() => agencyOpsSprint.id, { onDelete: "set null" }),
        sprintItemId: text("sprint_item_id")
            .notNull()
            .references(() => agencyOpsSprintItem.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        description: text("description").notNull().default(""),
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
