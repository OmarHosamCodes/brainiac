ALTER TABLE "agency_ops_project" ADD COLUMN "color_hue_id" integer;--> statement-breakpoint
CREATE TABLE "agency_ops_project_template" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_ops_user_favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_project_template" ADD CONSTRAINT "agency_ops_project_template_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project_template" ADD CONSTRAINT "agency_ops_project_template_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_user_favorite" ADD CONSTRAINT "agency_ops_user_favorite_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_user_favorite" ADD CONSTRAINT "agency_ops_user_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_user_favorite" ADD CONSTRAINT "agency_ops_user_favorite_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_user_favorite" ADD CONSTRAINT "agency_ops_user_favorite_task_id_agency_ops_project_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agency_ops_project_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_project_template_team_idx" ON "agency_ops_project_template" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_template_team_name_idx" ON "agency_ops_project_template" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "agency_ops_user_favorite_team_user_idx" ON "agency_ops_user_favorite" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_user_favorite_user_project_unique" ON "agency_ops_user_favorite" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_user_favorite_user_task_unique" ON "agency_ops_user_favorite" USING btree ("user_id","task_id");
