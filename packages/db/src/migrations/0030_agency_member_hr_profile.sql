CREATE TABLE IF NOT EXISTS "agency_ops_member_hr_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"employee_code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"employment_type" text,
	"work_model" text,
	"gender" text,
	"date_of_birth" text,
	"phone" text,
	"address" text,
	"linkedin_url" text,
	"x_url" text,
	"instagram_url" text,
	"pto_allowance_days" integer DEFAULT 15 NOT NULL,
	"sick_allowance_days" integer DEFAULT 10 NOT NULL,
	"other_allowance_days" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_hr_profile" ADD CONSTRAINT "agency_ops_member_hr_profile_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_hr_profile" ADD CONSTRAINT "agency_ops_member_hr_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_member_hr_profile_team_user_uidx" ON "agency_ops_member_hr_profile" USING btree ("team_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_hr_profile_team_idx" ON "agency_ops_member_hr_profile" USING btree ("team_id");
