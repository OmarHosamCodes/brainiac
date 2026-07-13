CREATE TABLE "agency_ops_active_timer_tag" (
	"active_timer_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "agency_ops_active_timer_tag_active_timer_id_tag_id_pk" PRIMARY KEY("active_timer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "agency_ops_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_ops_time_entry_tag" (
	"time_entry_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "agency_ops_time_entry_tag_time_entry_id_tag_id_pk" PRIMARY KEY("time_entry_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer" ADD COLUMN "is_billable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry" ADD COLUMN "is_billable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer_tag" ADD CONSTRAINT "agency_ops_active_timer_tag_active_timer_id_agency_ops_active_timer_id_fk" FOREIGN KEY ("active_timer_id") REFERENCES "public"."agency_ops_active_timer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_active_timer_tag" ADD CONSTRAINT "agency_ops_active_timer_tag_tag_id_agency_ops_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."agency_ops_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_tag" ADD CONSTRAINT "agency_ops_tag_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_tag" ADD CONSTRAINT "agency_ops_tag_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry_tag" ADD CONSTRAINT "agency_ops_time_entry_tag_time_entry_id_agency_ops_time_entry_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."agency_ops_time_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_time_entry_tag" ADD CONSTRAINT "agency_ops_time_entry_tag_tag_id_agency_ops_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."agency_ops_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_tag_timer_idx" ON "agency_ops_active_timer_tag" USING btree ("active_timer_id");--> statement-breakpoint
CREATE INDEX "agency_ops_active_timer_tag_tag_idx" ON "agency_ops_active_timer_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "agency_ops_tag_team_idx" ON "agency_ops_tag" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_tag_team_name_idx" ON "agency_ops_tag" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_tag_entry_idx" ON "agency_ops_time_entry_tag" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "agency_ops_time_entry_tag_tag_idx" ON "agency_ops_time_entry_tag" USING btree ("tag_id");