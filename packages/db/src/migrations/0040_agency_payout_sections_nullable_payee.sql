ALTER TABLE "agency_ops_payout_line" ALTER COLUMN "payee_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "agency_ops_payout_line" ADD COLUMN IF NOT EXISTS "cohort_key" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "agency_ops_payout_line_section_payee_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_payout_line_section_payee_unique" ON "agency_ops_payout_line" USING btree ("section_id","payee_user_id") WHERE "payee_user_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agency_ops_payout_line_section_label_unique" ON "agency_ops_payout_line" USING btree ("section_id","label") WHERE "payee_user_id" is null;
