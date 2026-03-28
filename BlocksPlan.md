[Strategy]
**Block 1: OKR Tracker**

**What it is:** A full Objectives & Key Results system for tracking strategic goals.

**How it works:**

Each Objective is a card with an editable title (e.g., "Scale to 250K EGP/month")

Each Objective contains multiple Key Results - specific measurable outcomes

Every Key Result has a progress slider (0-100%) and a visual progress bar

The Objective card shows an auto-calculated average of all its KRs as a large percentage

Cards are color-coded by health: green (≥75%), yellow (≥40%), red (<40%) - shown as the left border

**Interactive elements:**

"New Objective" button - creates a blank objective card

"Add KR" button - adds a new key result row to any objective

Delete button - removes an entire objective

Inline editing - click any text to edit directly

Slider interaction - drag to update progress, number updates in real time

**Pre-loaded data:**

**Objective 1:** "Scale to 250K EGP/month" with 3 KRs (Close 3 retainers: 33%, Deal size 18K: 60%, Churn <10%: 80%)

## **Objective 2:** "Launch course Q2" with 3 KRs (Curriculum: 70%, Record 6 modules: 33%, Sales funnel: 10%)

--

**Block 2: Decision Matrix (Weighted Scoring)**

**What it is:** A quantitative decision-making tool that scores options against weighted criteria to produce an objective recommendation.

**How it works:**

Question field at top: "What decision are you making?"

Criteria rows - each criterion has a name and a weight slider (1-10)

Option columns - each option scores against every criterion (0-10 slider)

Score calculation: For each option, the formula is Σ(criterion_score × criterion_weight)

Result cards show each option's total score, a progress bar showing relative standing, and a "RECOMMENDED" badge on the winner

Default criteria: Revenue Impact (weight 5), Time to Execute (weight 3), Risk Level (weight 4)

Default options: Option A, Option B (both renamable)

**Interactive elements:**

All criterion names are editable inline

All option names are editable inline

Weight sliders (1-10) per criterion

Score sliders (0-10) per option per criterion

"Add Criteria" button - adds a new row

"Add Option" button - adds a new column (auto-named Option C, D, etc.)

Results update in real time as any slider moves

## **Use cases:** Should we add a new service? Hire vs outsource? Retainer vs project pricing? Which client to prioritize?

**Block 3: Business Model Canvas (BMC)**

**What it is:** The classic Osterwalder Business Model Canvas - a 9-cell strategic framework rendered as an interactive grid.

**Layout:** CSS Grid matching the standard BMC layout:

Row 1: Key Partners | Key Activities | Value Propositions | Customer Relationships | Customer Segments

Row 2: (continues) | Key Resources | (continues) | Channels | (continues)

Row 3: Cost Structure (spans left half) | Revenue Streams (spans right half)

**How it works:**

Each cell is an editable textarea - type directly into any cell

Cells have placeholder text suggesting what belongs there (e.g., "Freelancers, tool providers, media partners...")

An "AI Analyze" button sends the current BMC contents to the Strategy AI agent for gap analysis

## **Pre-loaded data:** Key Activities and Value Propositions cells are pre-filled with School of Marketing defaults.

**Block 4: Strategic Assumption Tracker**

**What it is:** A structured tracker for the critical assumptions behind strategic goals, decisions, and business model bets.

**How it works:**

Each assumption is a card with: editable assumption statement, linked strategic area (OKR / Decision / BMC), owner, review date, and confidence score

Confidence slider (1-5) shows how certain the team is that the assumption is true

Status states: Validating (yellow), Confirmed (green), At Risk (red), False (gray)

Evidence notes field captures what data, customer input, or market proof supports the assumption

Cards can be filtered by status so leadership can quickly see which assumptions may break the strategy

**Interactive elements:**

"New Assumption" button - creates a blank assumption card

Link dropdown - connects the assumption to an Objective, decision, or BMC area

Confidence slider - updates confidence in real time

Status toggle buttons per card

Inline editing for assumption text, owner, and evidence notes

**Pre-loaded data:**

3 assumptions: "Senior marketers will pay premium for practical training" (Validating, confidence 4), "Content-led demand can fill the next cohort" (At Risk, confidence 3), "Agency case studies will strengthen conversion rate" (Confirmed, confidence 5)

**Use cases:** Pressure-test strategy before execution, track risky bets, identify what must be proven next.
