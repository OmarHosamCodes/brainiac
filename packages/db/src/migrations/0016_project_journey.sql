CREATE TABLE IF NOT EXISTS "agency_ops_project_journey" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_project_journey_step" (
	"id" text PRIMARY KEY NOT NULL,
	"journey_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"step_kind" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"task_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD COLUMN IF NOT EXISTS "task_kind" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD COLUMN IF NOT EXISTS "journey_step_id" text;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_journey" ADD CONSTRAINT "agency_ops_project_journey_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_journey_step" ADD CONSTRAINT "agency_ops_project_journey_step_journey_id_agency_ops_project_journey_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."agency_ops_project_journey"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_journey_step" ADD CONSTRAINT "agency_ops_project_journey_step_task_id_agency_ops_project_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_journey_step_id_agency_ops_project_journey_step_id_fk" FOREIGN KEY ("journey_step_id") REFERENCES "public"."agency_ops_project_journey_step"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_project_journey_project_unique" ON "agency_ops_project_journey" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_journey_step_journey_idx" ON "agency_ops_project_journey_step" USING btree ("journey_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_journey_step_journey_sort_idx" ON "agency_ops_project_journey_step" USING btree ("journey_id","sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_journey_step_task_idx" ON "agency_ops_project_journey_step" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_task_kind_idx" ON "agency_ops_project_task" USING btree ("team_id","task_kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_time_entry_journey_step_idx" ON "agency_ops_time_entry" USING btree ("journey_step_id");
