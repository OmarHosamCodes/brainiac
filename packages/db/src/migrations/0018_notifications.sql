CREATE TABLE IF NOT EXISTS "notification" (
  "id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL,
  "recipient_user_id" text NOT NULL,
  "actor_user_id" text,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "read_at" timestamp,
  "seen_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preference" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "team_id" text NOT NULL,
  "type" text NOT NULL,
  "in_app" boolean DEFAULT true NOT NULL,
  "push" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipient_created_idx" ON "notification" USING btree ("recipient_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_team_recipient_idx" ON "notification" USING btree ("team_id","recipient_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipient_unread_idx" ON "notification" USING btree ("recipient_user_id","read_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preference_user_team_type_unique" ON "notification_preference" USING btree ("user_id","team_id","type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscription_endpoint_unique" ON "push_subscription" USING btree ("endpoint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscription_user_idx" ON "push_subscription" USING btree ("user_id");
