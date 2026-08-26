CREATE TABLE IF NOT EXISTS "agency_ops_period_fx" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" text NOT NULL,
	"fx_as_of" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_period_fx" ADD CONSTRAINT "agency_ops_period_fx_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_period_fx_team_idx" ON "agency_ops_period_fx" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_period_fx_team_period_pair_unique" ON "agency_ops_period_fx" USING btree ("team_id","period_start","period_end","from_currency","to_currency");
