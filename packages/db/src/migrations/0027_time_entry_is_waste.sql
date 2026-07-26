ALTER TABLE "agency_ops_time_entry" ADD COLUMN IF NOT EXISTS "is_waste" boolean DEFAULT false NOT NULL;
