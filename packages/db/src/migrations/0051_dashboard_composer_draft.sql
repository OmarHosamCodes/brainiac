CREATE TABLE "dashboard_composer_draft" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "conversation_id" text REFERENCES "dashboard_conversation"("id") ON DELETE cascade,
  "text" text DEFAULT '' NOT NULL,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "saved_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "dashboard_composer_draft_user_idx" ON "dashboard_composer_draft" ("user_id");
CREATE UNIQUE INDEX "dashboard_composer_draft_user_conversation_uidx"
  ON "dashboard_composer_draft" ("user_id", coalesce("conversation_id", ''));
