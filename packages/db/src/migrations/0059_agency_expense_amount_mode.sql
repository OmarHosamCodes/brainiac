ALTER TABLE "agency_ops_expense" ADD COLUMN IF NOT EXISTS "amount_mode" text DEFAULT 'fixed' NOT NULL;
