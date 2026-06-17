DROP TABLE IF EXISTS "agency_ops_active_timer_tag";--> statement-breakpoint
DROP TABLE IF EXISTS "agency_ops_time_entry_tag";--> statement-breakpoint
DROP TABLE IF EXISTS "agency_ops_tag";--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" DROP COLUMN IF EXISTS "link_url";--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" DROP COLUMN IF EXISTS "link_url";
