import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type AgencyOpsTimeEntrySource = "timer" | "manual";
export type AgencyOpsProjectTaskStatus = "open" | "in_progress" | "done" | "archived";
export type AgencyOpsProjectTaskKind = "standard" | "journey_anchor" | "journey_milestone";
export type AgencyOpsJourneyStepKind = "start" | "milestone" | "checkpoint" | "destination";
export type AgencyOpsJourneyStepStatus = "planned" | "active" | "done" | "blocked";
export type AgencyOpsProjectTaskMemberStatus = "open" | "in_progress" | "done";
export type AgencyOpsTaskMessageType = "text" | "voice" | "attachment";
export type AgencyOpsTaskMessageSenderType = "user" | "agent";

export type AttachmentMetadata = {
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationSeconds?: number;
  fileExtension?: string;
  lastModified?: string;
  mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other" | "link";
  sourceUrl?: string;
};

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
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("agency_ops_client_team_idx").on(table.teamId),
    index("agency_ops_client_team_name_idx").on(table.teamId, table.name),
    index("agency_ops_client_team_archived_idx").on(table.teamId, table.archivedAt),
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

export const agencyOpsProjectJourney = pgTable(
  "agency_ops_project_journey",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("agency_ops_project_journey_project_unique").on(table.projectId)],
);

export const agencyOpsProjectTask = pgTable(
  "agency_ops_project_task",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").$type<AgencyOpsProjectTaskStatus>().notNull().default("open"),
    taskKind: text("task_kind").$type<AgencyOpsProjectTaskKind>().notNull().default("standard"),
    assignedToTeam: boolean("assigned_to_team").notNull().default(false),
    isWaste: boolean("is_waste").notNull().default(false),
    dueDate: timestamp("due_date"),
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
    index("agency_ops_project_task_team_idx").on(table.teamId),
    index("agency_ops_project_task_team_project_idx").on(table.teamId, table.projectId),
    index("agency_ops_project_task_project_created_idx").on(table.projectId, table.createdAt),
    index("agency_ops_project_task_status_idx").on(table.teamId, table.status),
    index("agency_ops_project_task_due_date_idx").on(table.dueDate),
    index("agency_ops_project_task_assigned_to_team_idx").on(table.teamId, table.assignedToTeam),
    index("agency_ops_project_task_task_kind_idx").on(table.teamId, table.taskKind),
    // Must match normalizeTaskTitle() / migration 0013 expression.
    uniqueIndex("agency_ops_project_task_project_title_unique").on(
      table.projectId,
      sql`(lower(trim(regexp_replace(${table.title}, '\\s+', ' ', 'g'))))`,
    ),
  ],
);

export const agencyOpsProjectJourneyStep = pgTable(
  "agency_ops_project_journey_step",
  {
    id: text("id").primaryKey(),
    journeyId: text("journey_id")
      .notNull()
      .references(() => agencyOpsProjectJourney.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    label: text("label").notNull(),
    stepKind: text("step_kind").$type<AgencyOpsJourneyStepKind>().notNull(),
    status: text("status").$type<AgencyOpsJourneyStepStatus>().notNull().default("planned"),
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_journey_step_journey_idx").on(table.journeyId),
    index("agency_ops_project_journey_step_journey_sort_idx").on(table.journeyId, table.sortOrder),
    index("agency_ops_project_journey_step_task_idx").on(table.taskId),
  ],
);

export const agencyOpsProjectTaskAssignee = pgTable(
  "agency_ops_project_task_assignee",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_project_task_assignee_task_user_unique").on(table.taskId, table.userId),
    index("agency_ops_project_task_assignee_user_idx").on(table.userId),
    index("agency_ops_project_task_assignee_task_idx").on(table.taskId),
  ],
);

export const agencyOpsProjectTaskMemberStatus = pgTable(
  "agency_ops_project_task_member_status",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<AgencyOpsProjectTaskMemberStatus>()
      .notNull()
      .default("open"),
    completionCount: integer("completion_count").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_project_task_member_status_task_user_unique").on(
      table.taskId,
      table.userId,
    ),
    index("agency_ops_project_task_member_status_user_status_idx").on(table.userId, table.status),
    index("agency_ops_project_task_member_status_task_idx").on(table.taskId),
  ],
);

export const agencyOpsProjectTaskBlueprint = pgTable(
  "agency_ops_project_task_blueprint",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_task_blueprint_team_idx").on(table.teamId),
    index("agency_ops_project_task_blueprint_task_idx").on(table.taskId),
    index("agency_ops_project_task_blueprint_user_task_idx").on(table.userId, table.taskId),
  ],
);

export const agencyOpsTaskThread = pgTable(
  "agency_ops_task_thread",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_task_thread_team_idx").on(table.teamId),
    uniqueIndex("agency_ops_task_thread_task_unique").on(table.taskId),
  ],
);

export const agencyOpsTaskMessage = pgTable(
  "agency_ops_task_message",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    threadId: text("thread_id")
      .notNull()
      .references(() => agencyOpsTaskThread.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    type: text("type").$type<AgencyOpsTaskMessageType>().notNull().default("text"),
    senderType: text("sender_type")
      .$type<AgencyOpsTaskMessageSenderType>()
      .notNull()
      .default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("agency_ops_task_message_team_idx").on(table.teamId),
    index("agency_ops_task_message_thread_created_idx").on(table.threadId, table.createdAt),
    index("agency_ops_task_message_user_idx").on(table.userId),
  ],
);

export const agencyOpsTaskAttachment = pgTable(
  "agency_ops_task_attachment",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => agencyOpsTaskMessage.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    metadata: jsonb("metadata").$type<AttachmentMetadata | null>().default(null),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("agency_ops_task_attachment_team_idx").on(table.teamId),
    index("agency_ops_task_attachment_message_idx").on(table.messageId),
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
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
    journeyStepId: text("journey_step_id").references(() => agencyOpsProjectJourneyStep.id, {
      onDelete: "set null",
    }),
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
    index("agency_ops_time_entry_team_task_idx").on(table.teamId, table.taskId),
    index("agency_ops_time_entry_journey_step_idx").on(table.journeyStepId),
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
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
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
    index("agency_ops_active_timer_task_idx").on(table.taskId),
  ],
);

// ---------------------------------------------------------------------------
// Client contact
// ---------------------------------------------------------------------------

export const agencyOpsClientContact = pgTable(
  "agency_ops_client_contact",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_client_contact_client_unique").on(table.clientId),
    index("agency_ops_client_contact_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Member rates
// ---------------------------------------------------------------------------

export const agencyOpsMemberRate = pgTable(
  "agency_ops_member_rate",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Cost to the agency per hour, in the team's currency minor units (cents). */
    costRateCents: integer("cost_rate_cents"),
    /** Rate billed to clients per hour, in minor units. */
    billableRateCents: integer("billable_rate_cents"),
    currency: text("currency").notNull().default("USD"),
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_rate_team_user_unique").on(table.teamId, table.userId),
    index("agency_ops_member_rate_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Member capacity (per week)
// ---------------------------------------------------------------------------

export const agencyOpsMemberCapacity = pgTable(
  "agency_ops_member_capacity",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** ISO Monday of the week this capacity applies to (UTC midnight). */
    weekStart: timestamp("week_start").notNull(),
    /** Capacity in seconds (e.g. 8h * 5d = 144000). */
    capacitySeconds: integer("capacity_seconds").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_capacity_team_user_week_unique").on(
      table.teamId,
      table.userId,
      table.weekStart,
    ),
    index("agency_ops_member_capacity_team_idx").on(table.teamId),
    index("agency_ops_member_capacity_team_week_idx").on(table.teamId, table.weekStart),
  ],
);

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type AgencyOpsInvoiceStatus = "draft" | "sent" | "paid";

export const agencyOpsInvoice = pgTable(
  "agency_ops_invoice",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "restrict" }),
    /** Human-readable invoice number, e.g. INV-0001. Unique per team. */
    number: text("number").notNull(),
    status: text("status").$type<AgencyOpsInvoiceStatus>().notNull().default("draft"),
    /** Total in minor currency units. Derived from line items. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    issuedAt: timestamp("issued_at"),
    paidAt: timestamp("paid_at"),
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
    index("agency_ops_invoice_team_idx").on(table.teamId),
    index("agency_ops_invoice_team_status_idx").on(table.teamId, table.status),
    index("agency_ops_invoice_team_client_idx").on(table.teamId, table.clientId),
    uniqueIndex("agency_ops_invoice_team_number_unique").on(table.teamId, table.number),
  ],
);

export const agencyOpsInvoiceLineItem = pgTable(
  "agency_ops_invoice_line_item",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => agencyOpsInvoice.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    /** For time-derived items: the project name + date range. */
    projectId: text("project_id").references(() => agencyOpsProject.id, { onDelete: "set null" }),
    /** Duration in seconds (stored as integer seconds; divide by 3600 to get hours). */
    durationSeconds: integer("hours_seconds").notNull().default(0),
    rateCents: integer("rate_cents").notNull().default(0),
    amountCents: integer("amount_cents").notNull().default(0),
    /** Whether this line item was auto-generated from time entries. */
    fromTimeEntries: boolean("from_time_entries").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agency_ops_invoice_line_item_invoice_idx").on(table.invoiceId)],
);

// ---------------------------------------------------------------------------
// Member tenure (agency time)
// ---------------------------------------------------------------------------

export const agencyOpsTenurePolicy = pgTable(
  "agency_ops_tenure_policy",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    /** Calendar month (1–12) when the fiscal year starts, e.g. 4 = April. */
    fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
    /** Day of month when each fiscal month/year begins (e.g. 26 → periods run 26th–25th). */
    fiscalYearStartDay: integer("fiscal_year_start_day").notNull().default(1),
    quarterlyMinHours: integer("quarterly_min_hours").notNull().default(525),
    penaltyMonths: integer("penalty_months").notNull().default(6),
    internDurationMonths: integer("intern_duration_months").notNull().default(4),
    internDurationWeeks: integer("intern_duration_weeks").notNull().default(0),
    policyEffectiveFrom: timestamp("policy_effective_from").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("agency_ops_tenure_policy_team_unique").on(table.teamId)],
);

export const agencyOpsMemberTenureProfile = pgTable(
  "agency_ops_member_tenure_profile",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Manual override; when null, derived from first tracked time + policy duration. */
    internStart: timestamp("intern_start"),
    internEnd: timestamp("intern_end"),
    internCountsTowardTenure: boolean("intern_counts_toward_tenure").notNull().default(false),
    internExemptFromQuarterMin: boolean("intern_exempt_from_quarter_min").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_tenure_profile_team_user_unique").on(table.teamId, table.userId),
    index("agency_ops_member_tenure_profile_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Saved reports
// ---------------------------------------------------------------------------

export type AgencyOpsReportActivityAction =
  | "created"
  | "renamed"
  | "entries_excluded"
  | "entries_restored"
  | "entry_edited"
  | "waste_toggled"
  | "exported";

export const agencyOpsReport = pgTable(
  "agency_ops_report",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rangePreset: text("range_preset").notNull(),
    customFromDate: text("custom_from_date").notNull().default(""),
    customToDate: text("custom_to_date").notNull().default(""),
    rangeFrom: timestamp("range_from").notNull(),
    rangeTo: timestamp("range_to").notNull(),
    clientId: text("client_id").notNull().default(""),
    projectId: text("project_id").notNull().default(""),
    memberUserId: text("member_user_id").notNull().default(""),
    fieldIds: jsonb("field_ids").$type<string[]>().notNull().default([]),
    excludedEntryIds: jsonb("excluded_entry_ids").$type<string[]>().notNull().default([]),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_report_team_idx").on(table.teamId),
    index("agency_ops_report_team_updated_idx").on(table.teamId, table.updatedAt),
    index("agency_ops_report_team_range_from_idx").on(table.teamId, table.rangeFrom),
  ],
);

export const agencyOpsReportActivity = pgTable(
  "agency_ops_report_activity",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => agencyOpsReport.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").$type<AgencyOpsReportActivityAction>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_report_activity_report_idx").on(table.reportId),
    index("agency_ops_report_activity_report_created_idx").on(table.reportId, table.createdAt),
  ],
);

export type AgencyOpsTenureExemptionType =
  | "team_holiday"
  | "member_waiver"
  | "member_reduced_min"
  | "member_frozen_month";

export const agencyOpsTenureQuarterExemption = pgTable(
  "agency_ops_tenure_quarter_exemption",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    type: text("type").$type<AgencyOpsTenureExemptionType>().notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    fiscalQuarter: integer("fiscal_quarter").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    reducedMinHours: integer("reduced_min_hours"),
    /** Calendar month (1–12) within the fiscal quarter for frozen-month exemptions. */
    frozenMonth: integer("frozen_month"),
    reason: text("reason"),
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
    index("agency_ops_tenure_quarter_exemption_team_idx").on(table.teamId),
    index("agency_ops_tenure_quarter_exemption_team_quarter_idx").on(
      table.teamId,
      table.fiscalYear,
      table.fiscalQuarter,
    ),
    index("agency_ops_tenure_quarter_exemption_team_user_quarter_idx").on(
      table.teamId,
      table.userId,
      table.fiscalYear,
      table.fiscalQuarter,
    ),
  ],
);
