CREATE TABLE IF NOT EXISTS "agency_ops_payout_run" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_payout_section" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agency_ops_payout_line" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"payee_user_id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"rate_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_payout_run" ADD CONSTRAINT "agency_ops_payout_run_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_payout_run" ADD CONSTRAINT "agency_ops_payout_run_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_payout_section" ADD CONSTRAINT "agency_ops_payout_section_run_id_agency_ops_payout_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agency_ops_payout_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_payout_line" ADD CONSTRAINT "agency_ops_payout_line_section_id_agency_ops_payout_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."agency_ops_payout_section"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_payout_line" ADD CONSTRAINT "agency_ops_payout_line_payee_user_id_user_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_payout_run_team_idx" ON "agency_ops_payout_run" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_payout_run_team_period_idx" ON "agency_ops_payout_run" USING btree ("team_id","period_start","period_end");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_payout_run_team_period_unique" ON "agency_ops_payout_run" USING btree ("team_id","period_start","period_end");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_payout_section_run_idx" ON "agency_ops_payout_section" USING btree ("run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_payout_section_run_key_unique" ON "agency_ops_payout_section" USING btree ("run_id","key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_payout_line_section_idx" ON "agency_ops_payout_line" USING btree ("section_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_payout_line_payee_idx" ON "agency_ops_payout_line" USING btree ("payee_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_payout_line_section_payee_unique" ON "agency_ops_payout_line" USING btree ("section_id","payee_user_id");
