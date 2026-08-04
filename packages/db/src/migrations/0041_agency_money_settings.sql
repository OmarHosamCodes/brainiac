CREATE TABLE IF NOT EXISTS "agency_ops_money_settings" (
	"team_id" text PRIMARY KEY NOT NULL,
	"rules_json" jsonb DEFAULT '{"enabledRuleIds":[]}'::jsonb NOT NULL,
	"calc_options_json" jsonb DEFAULT '{"enabledOptionIds":[]}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_money_settings" ADD CONSTRAINT "agency_ops_money_settings_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
