-- Agency member tenure: policy, profiles, quarter exemptions

CREATE TABLE "agency_ops_tenure_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
	"quarterly_min_hours" integer DEFAULT 525 NOT NULL,
	"penalty_months" integer DEFAULT 6 NOT NULL,
	"intern_duration_months" integer DEFAULT 4 NOT NULL,
	"intern_duration_weeks" integer DEFAULT 0 NOT NULL,
	"policy_effective_from" timestamp NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_tenure_policy" ADD CONSTRAINT "agency_ops_tenure_policy_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_tenure_policy_team_unique" ON "agency_ops_tenure_policy" ("team_id");--> statement-breakpoint

CREATE TABLE "agency_ops_member_tenure_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"intern_start" timestamp,
	"intern_end" timestamp,
	"intern_counts_toward_tenure" boolean DEFAULT false NOT NULL,
	"intern_exempt_from_quarter_min" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_member_tenure_profile" ADD CONSTRAINT "agency_ops_member_tenure_profile_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_member_tenure_profile" ADD CONSTRAINT "agency_ops_member_tenure_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_member_tenure_profile_team_user_unique" ON "agency_ops_member_tenure_profile" ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "agency_ops_member_tenure_profile_team_idx" ON "agency_ops_member_tenure_profile" ("team_id");--> statement-breakpoint

CREATE TABLE "agency_ops_tenure_quarter_exemption" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"type" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_quarter" integer NOT NULL,
	"user_id" text,
	"reduced_min_hours" integer,
	"frozen_month" integer,
	"reason" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_ops_tenure_quarter_exemption" ADD CONSTRAINT "agency_ops_tenure_quarter_exemption_team_id_workspace_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."workspace_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_tenure_quarter_exemption" ADD CONSTRAINT "agency_ops_tenure_quarter_exemption_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_ops_tenure_quarter_exemption" ADD CONSTRAINT "agency_ops_tenure_quarter_exemption_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agency_ops_tenure_quarter_exemption_team_idx" ON "agency_ops_tenure_quarter_exemption" ("team_id");--> statement-breakpoint
CREATE INDEX "agency_ops_tenure_quarter_exemption_team_quarter_idx" ON "agency_ops_tenure_quarter_exemption" ("team_id","fiscal_year","fiscal_quarter");--> statement-breakpoint
CREATE INDEX "agency_ops_tenure_quarter_exemption_team_user_quarter_idx" ON "agency_ops_tenure_quarter_exemption" ("team_id","user_id","fiscal_year","fiscal_quarter");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_tenure_quarter_exemption_team_holiday_unique" ON "agency_ops_tenure_quarter_exemption" ("team_id","fiscal_year","fiscal_quarter") WHERE "type" = 'team_holiday';--> statement-breakpoint
CREATE UNIQUE INDEX "agency_ops_tenure_quarter_exemption_member_quarter_unique" ON "agency_ops_tenure_quarter_exemption" ("team_id","user_id","fiscal_year","fiscal_quarter") WHERE "user_id" IS NOT NULL;
