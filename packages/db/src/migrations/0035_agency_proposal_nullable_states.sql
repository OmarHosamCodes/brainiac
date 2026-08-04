-- Create/delete proposals store null before/after (no entity yet / gone).
ALTER TABLE "agent_agency_proposal"
ALTER COLUMN "before_state" DROP NOT NULL;

ALTER TABLE "agent_agency_proposal"
ALTER COLUMN "after_state" DROP NOT NULL;
