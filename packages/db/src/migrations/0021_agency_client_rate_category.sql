ALTER TABLE "agency_ops_client" ADD COLUMN "category" text DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD COLUMN "billable_rate_cents" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;
