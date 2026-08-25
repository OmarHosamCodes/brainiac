ALTER TABLE "agency_ops_tenure_policy"
  ALTER COLUMN "off_day_reduce_hours" SET DATA TYPE double precision
  USING "off_day_reduce_hours"::double precision;
