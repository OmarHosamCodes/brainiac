ALTER TABLE "agency_ops_member_hr_profile"
ADD COLUMN IF NOT EXISTS "leave_allowance_period" text DEFAULT 'year' NOT NULL;
