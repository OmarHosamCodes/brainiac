CREATE TABLE IF NOT EXISTS "agency_ops_member_profile_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"subject_user_id" text NOT NULL,
	"created_by_user_id" text,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"note" text,
	"context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp,
	"snoozed_until" timestamp,
	"removed_at" timestamp,
	"removed_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_profile_alert" ADD CONSTRAINT "agency_ops_member_profile_alert_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_profile_alert" ADD CONSTRAINT "agency_ops_member_profile_alert_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_profile_alert" ADD CONSTRAINT "agency_ops_member_profile_alert_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_profile_alert" ADD CONSTRAINT "agency_ops_member_profile_alert_removed_by_user_id_user_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_member_profile_alert_fingerprint_uidx" ON "agency_ops_member_profile_alert" USING btree ("team_id","subject_user_id","fingerprint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_profile_alert_team_subject_idx" ON "agency_ops_member_profile_alert" USING btree ("team_id","subject_user_id","status");
