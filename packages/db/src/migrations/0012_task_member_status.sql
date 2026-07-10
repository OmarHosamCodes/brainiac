CREATE TABLE IF NOT EXISTS "agency_ops_project_task_member_status" (
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_ops_project_task_member_status_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_member_status" ADD CONSTRAINT "agency_ops_project_task_member_status_task_id_agency_ops_project_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_member_status" ADD CONSTRAINT "agency_ops_project_task_member_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_member_status_user_status_idx" ON "agency_ops_project_task_member_status" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_member_status_task_idx" ON "agency_ops_project_task_member_status" USING btree ("task_id");
--> statement-breakpoint
INSERT INTO "agency_ops_project_task_member_status" ("task_id", "user_id", "status", "completed_at", "created_at", "updated_at")
SELECT
	a."task_id",
	a."user_id",
	CASE
		WHEN t."status" IN ('done', 'archived') THEN 'done'
		WHEN t."status" = 'in_progress' THEN 'in_progress'
		ELSE 'open'
	END,
	CASE WHEN t."status" IN ('done', 'archived') THEN now() ELSE NULL END,
	now(),
	now()
FROM "agency_ops_project_task_assignee" a
INNER JOIN "agency_ops_project_task" t ON t."id" = a."task_id"
ON CONFLICT ("task_id", "user_id") DO NOTHING;
