CREATE TABLE "agency_ops_time_entry_link" (
	"id" text PRIMARY KEY NOT NULL,
	"time_entry_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "agency_ops_active_timer_link" (
	"id" text PRIMARY KEY NOT NULL,
	"active_timer_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry_link" ADD CONSTRAINT "agency_ops_time_entry_link_time_entry_id_agency_ops_time_entry_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."agency_ops_time_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer_link" ADD CONSTRAINT "agency_ops_active_timer_link_active_timer_id_agency_ops_active_timer_id_fk" FOREIGN KEY ("active_timer_id") REFERENCES "public"."agency_ops_active_timer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_link_entry_idx" ON "agency_ops_time_entry_link" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_link_entry_sort_idx" ON "agency_ops_time_entry_link" USING btree ("time_entry_id","sort_order");--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_link_timer_idx" ON "agency_ops_active_timer_link" USING btree ("active_timer_id");--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_link_timer_sort_idx" ON "agency_ops_active_timer_link" USING btree ("active_timer_id","sort_order");
