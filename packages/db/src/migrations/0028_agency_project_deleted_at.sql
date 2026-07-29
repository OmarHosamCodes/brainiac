ALTER TABLE "agency_ops_project" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_project_team_deleted_idx" ON "agency_ops_project" USING btree ("team_id","deleted_at");
