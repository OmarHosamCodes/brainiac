ALTER TABLE "agency_ops_tenure_policy" ADD COLUMN IF NOT EXISTS "required_daily_hours" integer DEFAULT 8 NOT NULL;
ALTER TABLE "agency_ops_tenure_policy" ADD COLUMN IF NOT EXISTS "week_starts_on" integer DEFAULT 1 NOT NULL;
ALTER TABLE "agency_ops_tenure_policy" ADD COLUMN IF NOT EXISTS "weekend_duration_days" integer DEFAULT 2 NOT NULL;
