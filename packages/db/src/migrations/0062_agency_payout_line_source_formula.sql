ALTER TABLE "agency_ops_payout_line" ADD COLUMN IF NOT EXISTS "source_formula_id" text;--> statement-breakpoint
DROP INDEX IF EXISTS "agency_ops_payout_line_section_payee_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "agency_ops_payout_line_section_label_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_payout_line_section_payee_manual_unique" ON "agency_ops_payout_line" USING btree ("section_id","payee_user_id") WHERE "payee_user_id" is not null AND "source_formula_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_payout_line_section_label_manual_unique" ON "agency_ops_payout_line" USING btree ("section_id","label") WHERE "payee_user_id" is null AND "source_formula_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_payout_line_section_formula_payee_unique" ON "agency_ops_payout_line" USING btree ("section_id","source_formula_id","payee_user_id") WHERE "payee_user_id" is not null AND "source_formula_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_payout_line_section_formula_pool_unique" ON "agency_ops_payout_line" USING btree ("section_id","source_formula_id") WHERE "payee_user_id" is null AND "source_formula_id" is not null;
