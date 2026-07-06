CREATE TABLE "agency_ops_report" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"range_preset" text NOT NULL,
	"custom_from_date" text DEFAULT '' NOT NULL,
	"custom_to_date" text DEFAULT '' NOT NULL,
	"range_from" timestamp NOT NULL,
	"range_to" timestamp NOT NULL,
	"client_id" text DEFAULT '' NOT NULL,
	"project_id" text DEFAULT '' NOT NULL,
	"member_user_id" text DEFAULT '' NOT NULL,
	"field_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_entry_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_report" ADD CONSTRAINT "agency_ops_report_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_report" ADD CONSTRAINT "agency_ops_report_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_report" ADD CONSTRAINT "agency_ops_report_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_report_team_idx" ON "agency_ops_report" ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_report_team_updated_idx" ON "agency_ops_report" ("team_id","updated_at");--> statement-breakpoint
CREATE INDEX "agency_ops_report_team_range_from_idx" ON "agency_ops_report" ("team_id","range_from");--> statement-breakpoint
CREATE TABLE "agency_ops_report_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_report_activity" ADD CONSTRAINT "agency_ops_report_activity_report_id_agency_ops_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."agency_ops_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_report_activity" ADD CONSTRAINT "agency_ops_report_activity_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_report_activity_report_idx" ON "agency_ops_report_activity" ("report_id");--> statement-breakpoint
CREATE INDEX "agency_ops_report_activity_report_created_idx" ON "agency_ops_report_activity" ("report_id","created_at");
