ALTER TABLE "agency_ops_salary_pool" ADD COLUMN IF NOT EXISTS "paid_amount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "agency_ops_salary_pool" p
SET "paid_amount" = COALESCE(
  (SELECT SUM(s."paid_amount") FROM "agency_ops_salary_member_settlement" s WHERE s."pool_id" = p."id"),
  0
);
