ALTER TABLE "agency_ops_project_task" ADD COLUMN "assigned_to_team" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "agency_ops_project_task_assignee" (
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_ops_project_task_assignee_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_assignee" ADD CONSTRAINT "agency_ops_project_task_assignee_task_id_agency_ops_project_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_assignee" ADD CONSTRAINT "agency_ops_project_task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_project_task_assignee_user_idx" ON "agency_ops_project_task_assignee" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_task_assignee_task_idx" ON "agency_ops_project_task_assignee" USING btree ("task_id");--> statement-breakpoint
INSERT INTO "agency_ops_project_task_assignee" ("task_id", "user_id", "created_at")
SELECT "id", "assignee_user_id", now()
FROM "agency_ops_project_task"
WHERE "assignee_user_id" IS NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "agency_ops_project_task_assignee_idx";--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" DROP COLUMN "assignee_user_id";
