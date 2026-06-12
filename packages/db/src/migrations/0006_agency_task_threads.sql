-- Migration: agency task threads, messages, attachments, and task-level time tracking
-- Backfill one thread per existing agency_ops_project_task.

--> statement-breakpoint

-- Extend project tasks with workflow fields.
ALTER TABLE "agency_ops_project_task" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;
ALTER TABLE "agency_ops_project_task" ADD COLUMN "assignee_user_id" text;
ALTER TABLE "agency_ops_project_task" ADD COLUMN "due_date" timestamp;

--> statement-breakpoint

ALTER TABLE "agency_ops_project_task" ADD CONSTRAINT "agency_ops_project_task_assignee_user_id_user_id_fk"
  FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "agency_ops_project_task_assignee_idx" ON "agency_ops_project_task" USING btree ("assignee_user_id");
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_status_idx" ON "agency_ops_project_task" USING btree ("team_id", "status");
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_due_date_idx" ON "agency_ops_project_task" USING btree ("due_date");

--> statement-breakpoint

-- 1:1 thread per task.
CREATE TABLE IF NOT EXISTS "agency_ops_task_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"task_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_task_thread" ADD CONSTRAINT "agency_ops_task_thread_team_id_workspace_team_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade;
ALTER TABLE "agency_ops_task_thread" ADD CONSTRAINT "agency_ops_task_thread_task_id_agency_ops_project_task_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_thread_team_idx" ON "agency_ops_task_thread" USING btree ("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_task_thread_task_unique" ON "agency_ops_task_thread" USING btree ("task_id");

--> statement-breakpoint

-- Messages within a thread.
CREATE TABLE IF NOT EXISTS "agency_ops_task_message" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"sender_type" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_team_id_workspace_team_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade;
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_thread_id_agency_ops_task_thread_id_fk"
  FOREIGN KEY ("thread_id") REFERENCES "public"."agency_ops_task_thread"("id") ON DELETE cascade;
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_message_team_idx" ON "agency_ops_task_message" USING btree ("team_id");
CREATE INDEX IF NOT EXISTS "agency_ops_task_message_thread_created_idx" ON "agency_ops_task_message" USING btree ("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "agency_ops_task_message_user_idx" ON "agency_ops_task_message" USING btree ("user_id");

--> statement-breakpoint

-- Attachments linked to messages.
CREATE TABLE IF NOT EXISTS "agency_ops_task_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"message_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agency_ops_task_attachment" ADD CONSTRAINT "agency_ops_task_attachment_team_id_workspace_team_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade;
ALTER TABLE "agency_ops_task_attachment" ADD CONSTRAINT "agency_ops_task_attachment_message_id_agency_ops_task_message_id_fk"
  FOREIGN KEY ("message_id") REFERENCES "public"."agency_ops_task_message"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_attachment_team_idx" ON "agency_ops_task_attachment" USING btree ("team_id");
CREATE INDEX IF NOT EXISTS "agency_ops_task_attachment_message_idx" ON "agency_ops_task_attachment" USING btree ("message_id");

--> statement-breakpoint

-- Optional task linkage for time entries and active timer.
ALTER TABLE "agency_ops_time_entry" ADD COLUMN "task_id" text;
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_task_id_agency_ops_project_task_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "agency_ops_time_entry_team_task_idx" ON "agency_ops_time_entry" USING btree ("team_id", "task_id");

--> statement-breakpoint

ALTER TABLE "agency_ops_active_timer" ADD COLUMN "task_id" text;
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_task_id_agency_ops_project_task_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "agency_ops_active_timer_task_idx" ON "agency_ops_active_timer" USING btree ("task_id");

--> statement-breakpoint

-- Backfill one thread per existing task.
INSERT INTO "agency_ops_task_thread" ("id", "team_id", "task_id", "created_at", "updated_at")
SELECT
  'agency-thread-' || "id",
  "team_id",
  "id",
  now(),
  now()
FROM "agency_ops_project_task";
