CREATE TABLE IF NOT EXISTS "agency_ops_expense" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"period" text,
	"note" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"next_due_at" timestamp,
	"occurred_at" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_expense" ADD CONSTRAINT "agency_ops_expense_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_ops_expense" ADD CONSTRAINT "agency_ops_expense_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_expense_team_idx" ON "agency_ops_expense" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_expense_team_kind_idx" ON "agency_ops_expense" USING btree ("team_id","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_expense_team_next_due_idx" ON "agency_ops_expense" USING btree ("team_id","next_due_at");
