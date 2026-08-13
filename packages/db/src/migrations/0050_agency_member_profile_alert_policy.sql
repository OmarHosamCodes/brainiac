CREATE TABLE IF NOT EXISTS "agency_ops_member_profile_alert_policy" (
	"team_id" text PRIMARY KEY NOT NULL,
	"abnormal_day_enabled" boolean DEFAULT true NOT NULL,
	"abnormal_day_extra_hours" integer DEFAULT 4 NOT NULL,
	"month_pace_enabled" boolean DEFAULT true NOT NULL,
	"month_pace_percent" integer DEFAULT 85 NOT NULL,
	"quarter_pace_enabled" boolean DEFAULT true NOT NULL,
	"quarter_pace_percent" integer DEFAULT 85 NOT NULL,
	"waste_spike_enabled" boolean DEFAULT true NOT NULL,
	"waste_spike_percent" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_profile_alert_policy" ADD CONSTRAINT "agency_ops_member_profile_alert_policy_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
