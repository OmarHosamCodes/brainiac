CREATE TABLE IF NOT EXISTS "agency_ops_salary_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"run_id" text NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source_amount" integer,
	"fx_rate" text DEFAULT '1' NOT NULL,
	"fx_as_of" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_salary_member_settlement" (
	"id" text PRIMARY KEY NOT NULL,
	"pool_id" text NOT NULL,
	"user_id" text NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"finalized_at" timestamp,
	"finalized_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_pool" ADD CONSTRAINT "agency_ops_salary_pool_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_pool" ADD CONSTRAINT "agency_ops_salary_pool_run_id_agency_ops_payout_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agency_ops_payout_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_pool" ADD CONSTRAINT "agency_ops_salary_pool_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_member_settlement" ADD CONSTRAINT "agency_ops_salary_member_settlement_pool_id_agency_ops_salary_pool_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."agency_ops_salary_pool"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_member_settlement" ADD CONSTRAINT "agency_ops_salary_member_settlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_salary_member_settlement" ADD CONSTRAINT "agency_ops_salary_member_settlement_finalized_by_user_id_user_id_fk" FOREIGN KEY ("finalized_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_salary_pool_team_idx" ON "agency_ops_salary_pool" USING btree ("team_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_salary_pool_run_unique" ON "agency_ops_salary_pool" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_salary_member_settlement_pool_idx" ON "agency_ops_salary_member_settlement" USING btree ("pool_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_salary_member_settlement_user_idx" ON "agency_ops_salary_member_settlement" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_salary_member_settlement_pool_user_unique" ON "agency_ops_salary_member_settlement" USING btree ("pool_id","user_id");
