ALTER TABLE "agency_ops_invoice"
ADD COLUMN IF NOT EXISTS "received_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "agency_ops_invoice"
SET "received_cents" = "amount_cents"
WHERE "status" = 'paid' AND "received_cents" = 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_invoice_team_period_idx"
ON "agency_ops_invoice" USING btree ("team_id","period_start","period_end");
