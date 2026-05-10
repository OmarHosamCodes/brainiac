import {
  boolean,
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
    /** Quantity in hours (stored as fractional seconds / 3600). */
    hours: integer("hours_seconds").notNull().default(0),
    rateCents: integer("rate_cents").notNull().default(0),
    amountCents: integer("amount_cents").notNull().default(0),
    /** Whether this line item was auto-generated from time entries. */
    fromTimeEntries: boolean("from_time_entries").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_invoice_line_item_invoice_idx").on(table.invoiceId),
  ],
);
