CREATE TABLE "agency_ops_active_timer" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" text,
	"sprint_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"started_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_ops_client" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"brand_color" text DEFAULT '#2563eb' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agency_ops_project" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"budget_minutes" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agency_ops_sprint" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agency_ops_sprint_item" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" text NOT NULL,
	"type" text DEFAULT 'task' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"assignee_user_id" text,
	"estimate_minutes" integer DEFAULT 30 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agency_ops_time_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" text,
	"sprint_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text DEFAULT 'timer' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"duration_seconds" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_sprint_id_agency_ops_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."agency_ops_sprint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_sprint_item_id_agency_ops_sprint_item_id_fk" FOREIGN KEY ("sprint_item_id") REFERENCES "public"."agency_ops_sprint_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD CONSTRAINT "agency_ops_active_timer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD CONSTRAINT "agency_ops_client_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD CONSTRAINT "agency_ops_client_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD CONSTRAINT "agency_ops_project_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD CONSTRAINT "agency_ops_project_client_id_agency_ops_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agency_ops_client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD CONSTRAINT "agency_ops_project_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint" ADD CONSTRAINT "agency_ops_sprint_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint" ADD CONSTRAINT "agency_ops_sprint_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint" ADD CONSTRAINT "agency_ops_sprint_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint_item" ADD CONSTRAINT "agency_ops_sprint_item_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint_item" ADD CONSTRAINT "agency_ops_sprint_item_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint_item" ADD CONSTRAINT "agency_ops_sprint_item_sprint_id_agency_ops_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."agency_ops_sprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint_item" ADD CONSTRAINT "agency_ops_sprint_item_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_sprint_item" ADD CONSTRAINT "agency_ops_sprint_item_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_project_id_agency_ops_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."agency_ops_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_sprint_id_agency_ops_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."agency_ops_sprint"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_sprint_item_id_agency_ops_sprint_item_id_fk" FOREIGN KEY ("sprint_item_id") REFERENCES "public"."agency_ops_sprint_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD CONSTRAINT "agency_ops_time_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_active_timer_user_unique" ON "agency_ops_active_timer" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_team_idx" ON "agency_ops_active_timer" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_team_user_idx" ON "agency_ops_active_timer" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_client_team_idx" ON "agency_ops_client" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_client_team_status_idx" ON "agency_ops_client" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "agency_ops_client_team_name_idx" ON "agency_ops_client" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "agency_ops_project_team_idx" ON "agency_ops_project" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_team_client_idx" ON "agency_ops_project" USING btree ("team_id","client_id");--> statement-breakpoint
CREATE INDEX "agency_ops_project_team_status_idx" ON "agency_ops_project" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "agency_ops_project_team_archived_idx" ON "agency_ops_project" USING btree ("team_id","archived_at");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_team_idx" ON "agency_ops_sprint" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_team_project_idx" ON "agency_ops_sprint" USING btree ("team_id","project_id");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_team_status_idx" ON "agency_ops_sprint" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_team_dates_idx" ON "agency_ops_sprint" USING btree ("team_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_item_team_idx" ON "agency_ops_sprint_item" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_item_team_sprint_idx" ON "agency_ops_sprint_item" USING btree ("team_id","sprint_id");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_item_team_status_idx" ON "agency_ops_sprint_item" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_item_team_assignee_idx" ON "agency_ops_sprint_item" USING btree ("team_id","assignee_user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_sprint_item_sprint_position_idx" ON "agency_ops_sprint_item" USING btree ("sprint_id","position");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_team_idx" ON "agency_ops_time_entry" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_team_started_idx" ON "agency_ops_time_entry" USING btree ("team_id","started_at");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_team_project_idx" ON "agency_ops_time_entry" USING btree ("team_id","project_id");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_team_user_idx" ON "agency_ops_time_entry" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_user_started_idx" ON "agency_ops_time_entry" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_team_deleted_idx" ON "agency_ops_time_entry" USING btree ("team_id","deleted_at");