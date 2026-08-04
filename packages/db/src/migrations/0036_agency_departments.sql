CREATE TABLE IF NOT EXISTS "agency_ops_department" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_department" ADD CONSTRAINT "agency_ops_department_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_department" ADD CONSTRAINT "agency_ops_department_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_department_team_idx" ON "agency_ops_department" USING btree ("team_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_department_team_name_uidx" ON "agency_ops_department" USING btree ("team_id","name");
--> statement-breakpoint
ALTER TABLE "agency_ops_member_hr_profile"
ADD COLUMN IF NOT EXISTS "department_id" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_hr_profile" ADD CONSTRAINT "agency_ops_member_hr_profile_department_id_agency_ops_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."agency_ops_department"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_hr_profile_team_department_idx" ON "agency_ops_member_hr_profile" USING btree ("team_id","department_id");
