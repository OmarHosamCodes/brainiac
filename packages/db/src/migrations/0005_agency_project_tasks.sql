CREATE TABLE "agency_ops_project_task" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD CONSTRAINT "agency_ops_project_task_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD CONSTRAINT "agency_ops_project_task_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD CONSTRAINT "agency_ops_project_task_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_project_task_team_idx" ON "agency_ops_project_task" ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_task_team_project_idx" ON "agency_ops_project_task" ("team_id","project_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_task_project_created_idx" ON "agency_ops_project_task" ("project_id","created_at");
