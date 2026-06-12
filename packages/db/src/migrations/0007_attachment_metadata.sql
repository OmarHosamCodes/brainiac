-- Migration: add metadata jsonb column to agency_ops_task_attachment
--> statement-breakpoint
ALTER TABLE "agency_ops_task_attachment" ADD COLUMN "metadata" jsonb;
