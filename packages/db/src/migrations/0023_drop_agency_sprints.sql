ALTER TABLE "agency_ops_active_timer" DROP COLUMN IF EXISTS "sprint_id";--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" DROP COLUMN IF EXISTS "sprint_item_id";--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" DROP COLUMN IF EXISTS "sprint_id";--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" DROP COLUMN IF EXISTS "sprint_item_id";--> statement-breakpoint
DROP TABLE IF EXISTS "agency_ops_sprint_item";--> statement-breakpoint
DROP TABLE IF EXISTS "agency_ops_sprint";
