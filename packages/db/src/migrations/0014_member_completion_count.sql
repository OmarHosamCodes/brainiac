ALTER TABLE "agency_ops_project_task_member_status"
ADD COLUMN IF NOT EXISTS "completion_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "agency_ops_project_task_member_status"
SET
	"completion_count" = 1,
	"status" = 'open'
WHERE "status" = 'done' AND "completion_count" = 0;
