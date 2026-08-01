CREATE TABLE IF NOT EXISTS "agency_ops_member_leave" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_member_review" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"subject_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"review_date" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_leave" ADD CONSTRAINT "agency_ops_member_leave_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_leave" ADD CONSTRAINT "agency_ops_member_leave_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_leave" ADD CONSTRAINT "agency_ops_member_leave_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_review" ADD CONSTRAINT "agency_ops_member_review_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_review" ADD CONSTRAINT "agency_ops_member_review_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_member_review" ADD CONSTRAINT "agency_ops_member_review_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_leave_team_idx" ON "agency_ops_member_leave" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_leave_team_user_idx" ON "agency_ops_member_leave" USING btree ("team_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_leave_team_dates_idx" ON "agency_ops_member_leave" USING btree ("team_id","start_date","end_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_review_team_subject_idx" ON "agency_ops_member_review" USING btree ("team_id","subject_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_member_review_team_subject_date_idx" ON "agency_ops_member_review" USING btree ("team_id","subject_user_id","review_date");
