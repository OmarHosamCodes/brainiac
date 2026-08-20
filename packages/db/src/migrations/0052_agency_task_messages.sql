CREATE TABLE IF NOT EXISTS "agency_ops_task_message" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_team_id_workspace_team_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_task_id_agency_ops_project_task_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_task_message" ADD CONSTRAINT "agency_ops_task_message_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_message_team_task_created_idx"
  ON "agency_ops_task_message" USING btree ("team_id","task_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_message_task_idx"
  ON "agency_ops_task_message" USING btree ("task_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_task_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"message_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_task_attachment" ADD CONSTRAINT "agency_ops_task_attachment_team_id_workspace_team_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_task_attachment" ADD CONSTRAINT "agency_ops_task_attachment_message_id_agency_ops_task_message_id_fk"
  FOREIGN KEY ("message_id") REFERENCES "public"."agency_ops_task_message"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_attachment_message_idx"
  ON "agency_ops_task_attachment" USING btree ("message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_task_attachment_team_idx"
  ON "agency_ops_task_attachment" USING btree ("team_id");
