CREATE TABLE "agency_ops_expense_occurrence" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_expense_occurrence" ADD CONSTRAINT "agency_ops_expense_occurrence_expense_id_agency_ops_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."agency_ops_expense"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_expense_occurrence_expense_due_unique" ON "agency_ops_expense_occurrence" USING btree ("expense_id","due_at");
--> statement-breakpoint
CREATE INDEX "agency_ops_expense_occurrence_due_idx" ON "agency_ops_expense_occurrence" USING btree ("due_at");
