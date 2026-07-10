CREATE TABLE IF NOT EXISTS "agency_ops_project_task_blueprint" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_blueprint" ADD CONSTRAINT "agency_ops_project_task_blueprint_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_blueprint" ADD CONSTRAINT "agency_ops_project_task_blueprint_task_id_agency_ops_project_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agency_ops_project_task_blueprint" ADD CONSTRAINT "agency_ops_project_task_blueprint_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_blueprint_team_idx" ON "agency_ops_project_task_blueprint" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_blueprint_task_idx" ON "agency_ops_project_task_blueprint" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_task_blueprint_user_task_idx" ON "agency_ops_project_task_blueprint" USING btree ("user_id","task_id");
