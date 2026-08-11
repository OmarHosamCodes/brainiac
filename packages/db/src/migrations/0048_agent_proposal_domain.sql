ALTER TABLE "agent_agency_proposal"
ADD COLUMN "domain" text DEFAULT 'agency' NOT NULL;

ALTER TABLE "agent_agency_proposal"
ALTER COLUMN "team_id" DROP NOT NULL;

CREATE INDEX "agent_agency_proposal_domain_status_idx"
ON "agent_agency_proposal" USING btree ("domain","status");
