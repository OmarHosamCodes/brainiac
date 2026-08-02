ALTER TABLE "agency_ops_member_hr_profile"
ADD COLUMN IF NOT EXISTS "off_allowance_days" integer DEFAULT 15 NOT NULL;

UPDATE "agency_ops_member_hr_profile"
SET "off_allowance_days" =
  COALESCE("pto_allowance_days", 0)
  + COALESCE("sick_allowance_days", 0)
  + COALESCE("other_allowance_days", 0);

ALTER TABLE "agency_ops_member_hr_profile"
DROP COLUMN IF EXISTS "pto_allowance_days",
DROP COLUMN IF EXISTS "sick_allowance_days",
DROP COLUMN IF EXISTS "other_allowance_days";
