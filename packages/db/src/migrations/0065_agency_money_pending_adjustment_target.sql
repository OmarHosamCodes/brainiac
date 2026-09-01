ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN "obligation_id" text;--> statement-breakpoint
ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN "applied_invoice_id" text;--> statement-breakpoint
ALTER TABLE "agency_ops_money_pending_adjustment" ADD COLUMN "invoice_line_item_id" text;--> statement-breakpoint
ALTER TABLE "agency_ops_money_pending_adjustment" ADD CONSTRAINT "agency_ops_money_pending_adjustment_applied_invoice_id_agency_ops_invoice_id_fk" FOREIGN KEY ("applied_invoice_id") REFERENCES "public"."agency_ops_invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_money_pending_adjustment" ADD CONSTRAINT "agency_ops_money_pending_adjustment_invoice_line_item_id_agency_ops_invoice_line_item_id_fk" FOREIGN KEY ("invoice_line_item_id") REFERENCES "public"."agency_ops_invoice_line_item"("id") ON DELETE set null ON UPDATE no action;
