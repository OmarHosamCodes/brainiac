ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "delivery_class" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_delivery_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "team_id" text NOT NULL,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "quiet_hours_start" text,
  "quiet_hours_end" text,
  "focus_until" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_deferred_push" (
  "id" text PRIMARY KEY NOT NULL,
  "notification_id" text NOT NULL,
  "team_id" text NOT NULL,
  "recipient_user_id" text NOT NULL,
  "deliver_after" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_digest_sent" (
  "id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL,
  "recipient_user_id" text NOT NULL,
  "digest_date" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_delivery_settings" ADD CONSTRAINT "notification_delivery_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_delivery_settings" ADD CONSTRAINT "notification_delivery_settings_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_deferred_push" ADD CONSTRAINT "notification_deferred_push_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_deferred_push" ADD CONSTRAINT "notification_deferred_push_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_deferred_push" ADD CONSTRAINT "notification_deferred_push_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_digest_sent" ADD CONSTRAINT "notification_digest_sent_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_digest_sent" ADD CONSTRAINT "notification_digest_sent_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_delivery_settings_user_team_unique" ON "notification_delivery_settings" USING btree ("user_id","team_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deferred_push_notification_unique" ON "notification_deferred_push" USING btree ("notification_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deferred_push_recipient_deliver_idx" ON "notification_deferred_push" USING btree ("recipient_user_id","deliver_after");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_digest_sent_team_recipient_date_unique" ON "notification_digest_sent" USING btree ("team_id","recipient_user_id","digest_date");
