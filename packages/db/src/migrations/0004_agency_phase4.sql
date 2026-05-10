-- Phase 4: client archive, contacts, member rates, member capacity, invoices

-- 1. Archive column on clients
ALTER TABLE "agency_ops_client" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "agency_ops_client_team_archived_idx" ON "agency_ops_client" ("team_id","archived_at");--> statement-breakpoint

-- 2. Client contacts (one per client)
CREATE TABLE "agency_ops_client_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"client_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_client_contact" ADD CONSTRAINT "agency_ops_client_contact_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_client_contact" ADD CONSTRAINT "agency_ops_client_contact_client_id_agency_ops_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_ops_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_client_contact_client_unique" ON "agency_ops_client_contact" ("client_id");--> statement-breakpoint
CREATE INDEX "agency_ops_client_contact_team_idx" ON "agency_ops_client_contact" ("team_id");--> statement-breakpoint

-- 3. Member rates
CREATE TABLE "agency_ops_member_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"cost_rate_cents" integer,
	"billable_rate_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD CONSTRAINT "agency_ops_member_rate_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD CONSTRAINT "agency_ops_member_rate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_member_rate_team_user_unique" ON "agency_ops_member_rate" ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_member_rate_team_idx" ON "agency_ops_member_rate" ("team_id");--> statement-breakpoint

-- 4. Member capacity (per week)
CREATE TABLE "agency_ops_member_capacity" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"week_start" timestamp NOT NULL,
	"capacity_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_member_capacity" ADD CONSTRAINT "agency_ops_member_capacity_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_member_capacity" ADD CONSTRAINT "agency_ops_member_capacity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_member_capacity_team_user_week_unique" ON "agency_ops_member_capacity" ("team_id","user_id","week_start");--> statement-breakpoint
CREATE INDEX "agency_ops_member_capacity_team_idx" ON "agency_ops_member_capacity" ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_member_capacity_team_week_idx" ON "agency_ops_member_capacity" ("team_id","week_start");--> statement-breakpoint

-- 5. Invoices
CREATE TABLE "agency_ops_invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"client_id" text NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"issued_at" timestamp,
	"paid_at" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD CONSTRAINT "agency_ops_invoice_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD CONSTRAINT "agency_ops_invoice_client_id_agency_ops_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_ops_client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD CONSTRAINT "agency_ops_invoice_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_invoice_team_idx" ON "agency_ops_invoice" ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_invoice_team_status_idx" ON "agency_ops_invoice" ("team_id","status");--> statement-breakpoint
CREATE INDEX "agency_ops_invoice_team_client_idx" ON "agency_ops_invoice" ("team_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_invoice_team_number_unique" ON "agency_ops_invoice" ("team_id","number");--> statement-breakpoint

-- 6. Invoice line items
CREATE TABLE "agency_ops_invoice_line_item" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"project_id" text,
	"hours_seconds" integer DEFAULT 0 NOT NULL,
	"rate_cents" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"from_time_entries" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_invoice_line_item" ADD CONSTRAINT "agency_ops_invoice_line_item_invoice_id_agency_ops_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."agency_ops_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_invoice_line_item" ADD CONSTRAINT "agency_ops_invoice_line_item_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_invoice_line_item_invoice_idx" ON "agency_ops_invoice_line_item" ("invoice_id");
