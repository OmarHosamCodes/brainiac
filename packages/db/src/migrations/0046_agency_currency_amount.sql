-- Unify Agency Money: amount naming, dual-store source/fx, team currency, FX table.

-- Money settings: agency currency + soft-lock
ALTER TABLE "agency_ops_money_settings" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_money_settings" ADD COLUMN IF NOT EXISTS "currency_locked_at" timestamp;--> statement-breakpoint

-- FX rates
CREATE TABLE IF NOT EXISTS "agency_ops_fx_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_fx_rate" ADD CONSTRAINT "agency_ops_fx_rate_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_fx_rate_team_idx" ON "agency_ops_fx_rate" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_fx_rate_team_pair_unique" ON "agency_ops_fx_rate" USING btree ("team_id","from_currency","to_currency");--> statement-breakpoint

-- Client rates
ALTER TABLE "agency_ops_client" RENAME COLUMN "billable_rate_cents" TO "billable_rate_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD COLUMN IF NOT EXISTS "source_billable_rate_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_client" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;--> statement-breakpoint
UPDATE "agency_ops_client" SET "source_billable_rate_amount" = "billable_rate_amount" WHERE "billable_rate_amount" IS NOT NULL AND "source_billable_rate_amount" IS NULL;--> statement-breakpoint

-- Member rates
ALTER TABLE "agency_ops_member_rate" RENAME COLUMN "cost_rate_cents" TO "cost_rate_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" RENAME COLUMN "billable_rate_cents" TO "billable_rate_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD COLUMN IF NOT EXISTS "source_cost_rate_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD COLUMN IF NOT EXISTS "source_billable_rate_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_member_rate" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;--> statement-breakpoint
UPDATE "agency_ops_member_rate" SET "source_cost_rate_amount" = "cost_rate_amount" WHERE "cost_rate_amount" IS NOT NULL AND "source_cost_rate_amount" IS NULL;--> statement-breakpoint
UPDATE "agency_ops_member_rate" SET "source_billable_rate_amount" = "billable_rate_amount" WHERE "billable_rate_amount" IS NOT NULL AND "source_billable_rate_amount" IS NULL;--> statement-breakpoint

-- Invoices
ALTER TABLE "agency_ops_invoice" RENAME COLUMN "amount_cents" TO "amount";--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" RENAME COLUMN "received_cents" TO "received_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD COLUMN IF NOT EXISTS "source_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_invoice" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;--> statement-breakpoint
UPDATE "agency_ops_invoice" SET "source_amount" = "amount" WHERE "source_amount" IS NULL;--> statement-breakpoint

-- Invoice line items
ALTER TABLE "agency_ops_invoice_line_item" RENAME COLUMN "rate_cents" TO "rate_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_invoice_line_item" RENAME COLUMN "amount_cents" TO "amount";--> statement-breakpoint

-- Pending adjustments (may not exist in all envs yet)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'agency_ops_money_pending_adjustment'
  ) THEN
    ALTER TABLE "agency_ops_money_pending_adjustment" RENAME COLUMN "amount_cents" TO "amount";
    ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;
    ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN IF NOT EXISTS "source_amount" integer;
    ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;
    ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;
    UPDATE "agency_ops_money_pending_adjustment" SET "source_amount" = "amount" WHERE "source_amount" IS NULL;
  END IF;
END $$;--> statement-breakpoint

-- Ensure pending adjustment table exists (compose-on-demand)
CREATE TABLE IF NOT EXISTS "agency_ops_money_pending_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"party_type" text NOT NULL,
	"party_id" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source_amount" integer,
	"fx_rate" text DEFAULT '1' NOT NULL,
	"fx_as_of" timestamp,
	"note" text DEFAULT '' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Payout lines
ALTER TABLE "agency_ops_payout_line" RENAME COLUMN "amount_cents" TO "amount";--> statement-breakpoint
ALTER TABLE "agency_ops_payout_line" RENAME COLUMN "paid_cents" TO "paid_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_payout_line" RENAME COLUMN "rate_cents" TO "rate_amount";--> statement-breakpoint

-- Expenses
ALTER TABLE "agency_ops_expense" RENAME COLUMN "amount_cents" TO "amount";--> statement-breakpoint
ALTER TABLE "agency_ops_expense" RENAME COLUMN "paid_cents" TO "paid_amount";--> statement-breakpoint
ALTER TABLE "agency_ops_expense" ADD COLUMN IF NOT EXISTS "source_amount" integer;--> statement-breakpoint
ALTER TABLE "agency_ops_expense" ADD COLUMN IF NOT EXISTS "fx_rate" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_expense" ADD COLUMN IF NOT EXISTS "fx_as_of" timestamp;--> statement-breakpoint
UPDATE "agency_ops_expense" SET "source_amount" = "amount" WHERE "source_amount" IS NULL;--> statement-breakpoint

-- Formula output kind cents → amount in money settings JSON
UPDATE "agency_ops_money_settings"
SET "calc_options_json" = replace("calc_options_json"::text, '"output":"cents"', '"output":"amount"')::jsonb
WHERE "calc_options_json"::text LIKE '%"output":"cents"%';--> statement-breakpoint

UPDATE "agency_ops_payout_run"
SET "formula_snapshot_json" = replace("formula_snapshot_json"::text, '"output":"cents"', '"output":"amount"')::jsonb
WHERE "formula_snapshot_json" IS NOT NULL AND "formula_snapshot_json"::text LIKE '%"output":"cents"%';
