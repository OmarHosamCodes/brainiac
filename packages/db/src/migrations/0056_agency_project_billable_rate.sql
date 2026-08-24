ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "billable_rate_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "source_billable_rate_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;
