CEO Second Brain v3.2 - Prebuilt Tools Documentation

_Complete Reference for All Domain Modules, Custom Blocks & AI Integration_

**Architecture Overview**

The app has 8 domains (7 business agents + 1 orchestrator), each containing prebuilt interactive modules tailored to that domain's work. Every domain also has a Custom Blocks tab for building your own tools, and an AI Agent sidebar that has full context of your data.

Navigation: Mind map → click domain node → tabbed workspace with modules → AI chat sidebar toggle

Folded Card Quick View Layer

What it is: A compact summary visible when a domain card is folded on the infinite canvas - designed for a 3-second scan by the CEO.

Shared structure across all folded cards:

• Domain name + icon + health status pill

• 2-3 KPI chips showing the most important current numbers

• 1 alert / blocker chip showing the main risk

• 1 next-action line showing what needs attention next

Design rule: The folded state should answer two questions immediately - "How healthy is this domain?" and "What needs attention next?"

**DOMAIN 1: 🎯 STRATEGY**

**Agent Color:** Indigo (#818cf8)

**Subtitle:** Vision · OKRs · Decisions

Folded Card Quick View

What should appear when folded:

• Overall OKR progress %

• Objectives off-track count

• Assumptions at risk count

• Next strategic decision or milestone

• Health pill derived from OKR status + risky assumptions

**Module 1.1: OKR Tracker**

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

**Objective 2:** "Launch course Q2" with 3 KRs (Curriculum: 70%, Record 6 modules: 33%, Sales funnel: 10%)

**Module 1.2: Decision Matrix (Weighted Scoring)**

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

**Use cases:** Should we add a new service? Hire vs outsource? Retainer vs project pricing? Which client to prioritize?

**Module 1.3: Business Model Canvas (BMC)**

**What it is:** The classic Osterwalder Business Model Canvas - a 9-cell strategic framework rendered as an interactive grid.

**Layout:** CSS Grid matching the standard BMC layout:

Row 1: Key Partners | Key Activities | Value Propositions | Customer Relationships | Customer Segments

Row 2: (continues) | Key Resources | (continues) | Channels | (continues)

Row 3: Cost Structure (spans left half) | Revenue Streams (spans right half)

**How it works:**

Each cell is an editable textarea - type directly into any cell

Cells have placeholder text suggesting what belongs there (e.g., "Freelancers, tool providers, media partners...")

An "AI Analyze" button sends the current BMC contents to the Strategy AI agent for gap analysis

**Pre-loaded data:** Key Activities and Value Propositions cells are pre-filled with School of Marketing defaults.

**Module 1.4: Strategic Assumption Tracker**

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

**DOMAIN 2: 👥 PEOPLE**

**Agent Color:** Pink (#f472b6)

**Subtitle:** Talent · Skills · Delegation

Folded Card Quick View

What should appear when folded:

• Recoverable CEO hours/week from delegation

• Fragile or uncovered seats count

• Overloaded seats count

• Critical people action next (hire / delegate / review)

• Health pill derived from seat coverage + overload level

**Module 2.1: Skills Heat Map**

**What it is:** A color-coded matrix showing every team member's proficiency across 5 key skill dimensions.

**Dimensions tracked:** Writing, Strategy, Design, Analytics, Leadership

**How it works:**

Table layout: Rows = team members (name + role), Columns = skills, Final column = average

Each cell displays a score from 1-10 with hue-based coloring: Red (≤3 = critical gap), Orange (4-5), Yellow (6-7), Green (8-10)

Click any cell to cycle the score up by 1 (wraps from 10 back to 1)

Average column auto-calculates the mean across all 5 skills

Color-coded cells make skill gaps visible at a glance without reading numbers

**Pre-loaded data:** 5 team members (Sarah, Omar, Nour, Karim, Layla) with realistic skill scores.

**Use cases:** Identify training needs, plan delegation (match tasks to strongest skill holders), hiring gap analysis.

**Module 2.2: Delegation Matrix**

**What it is:** A tracker for tasks Ahmed currently does that should be delegated to team members, with transition status tracking.

**How it works:**

Header shows total recoverable hours/week across all items - the headline KPI

Each row is a task card with: editable task name, "From" (Ahmed) → "To" (team member), hours/week saved, status buttons

Status states: Stuck (red), Transitioning (yellow), Delegated (green) - click to toggle

Left border color reflects status

**Interactive elements:**

Inline editing for task name and delegate-to name

Status toggle buttons per row

"Add task I shouldn't be doing" button - adds a new row

**Pre-loaded data:** 3 delegation items: Social scheduling (3h, stuck), Client reporting (5h, stuck), Content approvals (4h, transitioning)

Strategic purpose: Makes the cost of non-delegation visible. At \$500/hr CEO time, 12 stuck hours = \$6,000/week of misallocated CEO time.

**Module 2.3: 9-Box Talent Grid**

**What it is:** The classic HR 9-box grid plotting team members on a Performance (x-axis) × Potential (y-axis) matrix.

**Grid labels (3×3):**

Low PerformanceMed PerformanceHigh PerformanceHigh PotentialEnigmaGrowth StarSuperstarMed PotentialUnder-performerCore PlayerHigh PerformerLow PotentialRiskAverage JoeSpecialist

**How it works:**

Each cell is color-coded (red for risk, green for stars)

Team members appear as name badges inside their calculated cell

Below the grid: adjustment sliders for each member (Performance 1-5, Potential 1-5)

Moving sliders repositions the person in the grid in real time

**Pre-loaded data:** 5 team members with varied Performance/Potential scores.

**Use cases:** Succession planning, identifying who to invest in, who needs PIPs, who to promote.

**Module 2.4: Org Structure / Seat Ownership Planner**

**What it is:** A company seat map showing who owns each critical function, where accountability is unclear, and which seats are overloaded.

**How it works:**

Table layout: Rows = business seats, Columns = current owner, function, seat health, load level, backup owner, notes

Seat Health states: Strong (green), Fragile (yellow), Gap (red)

Load Level states: Underloaded, Balanced, Overloaded

Each row highlights management risk at a glance - especially seats with no clear owner or no backup

A summary KPI row shows filled seats, fragile seats, overloaded seats, and uncovered critical seats

**Interactive elements:**

Inline editing for seat name, owner, and notes

Seat Health dropdown per row

Load Level dropdown per row

"Add Critical Seat" button - adds a new business seat

Filter toggle - show only fragile, overloaded, or uncovered seats

**Pre-loaded data:**

5 seats: CEO (overloaded), Sales Lead (fragile), Content Lead (balanced), Operations / PMO (gap), Finance Admin (balanced)

**Use cases:** Clarify accountability, spot organizational bottlenecks, plan hiring and promotions, reduce founder dependency.

**DOMAIN 3: 💰 SALES**

**Agent Color:** Green (#34d399)

**Subtitle:** Pipeline · Scoring · Forecast

Folded Card Quick View

What should appear when folded:

• Forecasted revenue for the current period

• Commit amount vs target

• At-risk deals count

• Largest deal needing attention next

• Health pill derived from forecast confidence + deal risk

**Module 3.1: Deal Scoring Matrix**

**What it is:** A combined BANT scoring + temperature + pipeline stage tracker that ranks deals by priority.

**How it works:**

Deals are sorted by score (highest first) - highest-value deals appear at top

Each deal card shows: client name, deal value (EGP), temperature indicator (hot/warm/cold dot + dropdown), score (0-100), and a stage progress bar

Stage progress: 5 clickable segments (Lead → Consult → Proposal → Negotiate → Closed) - click any to move deal to that stage

Score slider (0-100) with color coding: green (≥75), yellow (≥50), red (<50)

Temperature dropdown: Hot (red dot), Warm (yellow), Cold (gray)

Below each card: Next action text + due date

**Pre-loaded data:** 3 deals: TechCo (15K, stage 2, hot, score 82), FoodBrand (8K, stage 1, warm, score 55), EduStart (22K, stage 3, hot, score 90)

**Module 3.2: Pipeline Funnel**

**What it is:** A visual sales funnel showing deals organized by stage with value totals.

**How it works:**

5 narrowing rows (100% → 84% → 68% → 52% → 36% width): Lead → Consultation → Proposal → Negotiation → Closed

Each row is color-coded and shows: stage name, deal count, total value

Below: list of all deals with stage dropdown for quick moves

Temperature dots next to each deal name

**Visual design:** The funnel narrows physically as you go down - making conversion drop-off visible at a glance.

**Module 3.3: Forecast Confidence Board**

**What it is:** A revenue forecasting layer that turns raw pipeline into a confidence-based sales forecast.

**How it works:**

Deals are grouped into 4 forecast buckets: Commit, Likely, Upside, At Risk

Each deal card shows: client name, deal value, expected close month, confidence %, owner, and next action

Weighted Forecast is auto-calculated using deal value × confidence %

Top KPI cards show: Commit Revenue, Weighted Forecast, At-Risk Value, and Coverage vs Target

Bucket totals update in real time as confidence or deal movement changes

**Interactive elements:**

Confidence slider (10-100%) per deal

Bucket dropdown - Commit / Likely / Upside / At Risk

Month picker for expected close timing

Inline editing for next action and owner

"Add Deal to Forecast" button - creates a new forecast item

**Pre-loaded data:**

TechCo in Commit (15K, 85%), EduStart in Likely (22K, 70%), FoodBrand in At Risk (8K, 35%)

**Use cases:** Monthly revenue calls, sales forecasting, identifying forecast gaps early, prioritizing rescue actions on weak deals.

**DOMAIN 4: 📝 CONTENT**

**Agent Color:** Yellow (#fbbf24)

**Subtitle:** Pipeline · Radar · Pillars

Folded Card Quick View

What should appear when folded:

• Pieces due this week

• Items stuck in review count

• Top-performing format or campaign

• Next publish priority

• Health pill derived from pipeline flow + ROI quality

**Module 4.1: Content Pipeline (Kanban)**

**What it is:** A 5-column Kanban board tracking content pieces from idea to publication.

Columns: Ideas (gray) → Draft (yellow) → Review (indigo) → Approved (green) → Published (pink)

**How it works:**

Each column shows a header with count and a colored status dot

Content cards show: editable title, platform pill (IG/TikTok/LinkedIn/YT), assignee pill

Status transition buttons on each card - click to move to any other column instantly

"New" button - creates a blank card in Ideas column

**Pre-loaded data:** 3 content pieces across different stages and platforms.

**Use cases:** Weekly content review, managing team output, tracking approval bottlenecks.

**Module 4.2: Content Quality Radar (Spider Chart)**

**What it is:** A live SVG spider/radar chart scoring content quality across 10 dimensions.

Dimensions scored (1-10):

Hook, Value, Emotion, CTA, Platform Fit, Brand, Shareability, Scroll-Stop, Authenticity, Storytelling

**How it works:**

SVG radar chart (280×280) with 4 concentric reference polygons (25%, 50%, 75%, 100%)

Filled polygon connects the 10 data points - shape reveals strengths and weaknesses visually

Score sliders (1-10) next to the chart for each dimension

Average score displayed as a large number (color-coded: green ≥7, yellow ≥5, red <5)

Chart updates in real time as sliders move

**Pre-loaded data:** Realistic scores showing strengths in Authenticity (9) and Brand (8), weaknesses in Shareability (4) and CTA (5).

**Use cases:** Content audit, identifying systematic weaknesses, tracking improvement over time, team feedback framework.

**Module 4.3: Content ROI Tracker**

**What it is:** A business impact tracker that measures which content pieces create real commercial value, not just output.

**How it works:**

Table layout: Rows = content pieces, Columns = platform, campaign, goal, reach, leads, conversion influence, repurpose value, ROI status

Each content row receives a composite ROI score based on leads generated, sales influence, and repurposing value

ROI Status is color-coded: High Return (green), Promising (yellow), Low Return (red)

A summary bar at the top shows top-performing platform, top-performing campaign, and total influenced leads

**Interactive elements:**

Inline editing for title, platform, and campaign

Numeric inputs for reach and leads

Conversion Influence score slider (1-10)

Repurpose Value score slider (1-10)

"Add Content Piece" button - creates a blank row

Sort toggle - by ROI, reach, or leads

**Pre-loaded data:**

3 content pieces: a LinkedIn authority post (high ROI), a TikTok educational video (promising), and an Instagram carousel (low ROI)

**Use cases:** Double down on winning formats, cut low-value content, prove content contribution to business growth.

**DOMAIN 5: 🎤 BRAND**

**Agent Color:** Purple (#a78bfa)

**Subtitle:** Authority · Scripts · Repurpose

Folded Card Quick View

What should appear when folded:

• Authority progress vs monthly target

• Active message pillar / core brand theme

• High-scoring hooks ready count

• Next authority asset to publish or record

• Health pill derived from authority momentum + message consistency

**Module 5.1: Authority Scorecard**

**What it is:** A 6-metric dashboard tracking Ahmed's thought leadership presence with targets.

**Metrics tracked (each with a target):**

Posts/Month (target: 20)

Videos/Month (target: 8)

Speaking Gigs (target: 2)

Podcast Appearances (target: 2)

Media Features (target: 4)

Followers (target: 10,000)

**How it works:**

6 cards in a 3×2 grid, each showing: icon, current value (large number), metric label, progress bar (% of target), target text

Click any card to increment the value by 1

Progress bars color-coded: green (≥75% of target), yellow (≥40%), red (<40%)

**Pre-loaded data:** Posts: 12, Videos: 4, Speaking: 1, Podcasts: 0, Features: 2, Followers: 5,400

**Module 5.2: Hook Bank**

**What it is:** A scored, categorized library of content hook templates.

**How it works:**

Hooks sorted by score (highest first)

Each hook shows: category pill (pattern-interrupt, investment, mistake, insider, etc.), hook text, and a 10-bar visual score indicator

Click the score bars to set the score (1-10) - visual bars fill accordingly

"Add Hook" button - creates a blank hook entry

"AI Generate" button - sends a prompt to the Brand agent to generate 5 new hooks

**Pre-loaded data:** 6 hooks across categories with scores 7-9.

**Module 5.3: Message House**

**What it is:** A core brand messaging framework that locks the brand promise, key pillars, proof points, and voice rules in one place.

**Layout:**

Top: Brand Promise (full-width hero statement)

Middle row: Pillar 1 | Pillar 2 | Pillar 3

Bottom row: Audience Pains | Proof Points | Voice Principles

**How it works:**

Each section is an editable text block with placeholder guidance

The three pillars define the main repeatable messages the brand should stand on

Proof Points capture evidence that supports the promise

Voice Principles keep scripts, posts, and brand assets consistent across the team

An "AI Stress-Test" button sends the full message house to the Brand agent to find gaps, contradictions, or weak proof

**Pre-loaded data:**

Brand Promise and 3 messaging pillars are pre-filled with School of Marketing positioning defaults.

**DOMAIN 6: 📊 FINANCE**

**Agent Color:** Red (#f87171)

**Subtitle:** Cash Flow · Pricing · P&L

Folded Card Quick View

What should appear when folded:

• Cash collected this month

• Outstanding / overdue amount

• Margin % or profit health snapshot

• Next invoice or payment risk needing action

• Health pill derived from collections status + margin health

**Module 6.1: Profitability & Cash Flow**

**What it is:** A financial overview showing revenue, expenses, profit, margins, and per-client profitability.

**Top section - 4 KPI cards:**

Revenue (green), Expenses (red), Profit (color-coded), Margin %

**Client breakdown:**

Each client row shows: name, payment status pill (paid/overdue/partial), health percentage bar, revenue, cost, and calculated margin percentage

Margin color-coded: green (>40%), yellow (>20%), red (≤20%)

**Expense breakdown:**

Category list (Salaries, Tools, Office, Marketing) with proportional bars showing % of total expenses

**Pre-loaded data:** 4 clients with revenue, costs, and payment statuses. 4 expense categories.

**Module 6.2: Pricing Simulator**

**What it is:** An interactive financial model with 4 adjustable variables that calculates pricing scenarios in real time.

**Input sliders:**

Hours/Client/Month (5-100)

Hourly Rate in EGP (100-2,000)

Monthly Overhead in EGP (10K-200K)

Target Margin % (10-80%)

**Output cards (auto-calculated):**

Projected Revenue = Rate × Hours × 4 weeks × Clients

Minimum Retainer/Client = Overhead ÷ (1 - Margin%) ÷ Clients ÷ 4

Projected Profit = Revenue - Overhead

**Use cases:** "What if I raise rates by 20%?", "Can I afford to hire?", "What's the minimum retainer I should accept?"

**Module 6.3: Collections & Receivables Tracker**

**What it is:** A cash collection tracker for outstanding invoices, follow-ups, and overdue risk.

**How it works:**

Top KPI cards show: Total Outstanding, Overdue Amount, Due This Week, and Collected This Month

Each invoice row shows: client name, invoice amount, due date, days overdue, collection owner, next follow-up date, and payment status pill

Payment status states: Paid (green), Due Soon (yellow), Partial (indigo), Overdue (red)

Risk level is auto-highlighted based on amount and delay length so finance can focus where cash is most exposed

**Interactive elements:**

Inline editing for client, owner, and follow-up notes

Date picker for due date and next follow-up

Status dropdown per invoice

"Add Invoice" button - creates a new receivable row

Quick filter - show only overdue, high-risk, or due-this-week invoices

**Pre-loaded data:**

4 invoices: one paid, one due soon, one partial, and one overdue by 18 days

**Use cases:** Improve cash discipline, reduce aging receivables, make follow-up ownership visible.

**DOMAIN 7: 🎓 EDUCATION**

**Agent Color:** Teal (#2dd4bf)

**Subtitle:** Curriculum · Outcomes · Recording

Folded Card Quick View

What should appear when folded:

• Seats sold / capacity for active cohorts

• Cohorts at risk count

• Production completion % for the next launch

• Next cohort start date or launch milestone

• Health pill derived from enrollment health + production readiness

**Module 7.1: Course Roadmap**

**What it is:** A visual progress tracker for courses with clickable lesson completion.

**How it works:**

Each course is a card showing: name, recorded/total count, completion %, status pill (in-progress/planning), and a progress bar

Lesson flow: Horizontal pill buttons for each lesson (numbered), color-coded: green with checkmark (recorded) vs gray (pending)

Click any lesson to toggle its recorded status - progress bar and percentage update instantly

Learning outcomes listed below (checkmarks)

**Pre-loaded data:**

"Content Marketing Mastery" - 6 modules, 2 recorded (33%), with outcomes

"Agency Growth Blueprint" - 8 modules, 0 recorded (0%), with outcomes

**Module 7.2: Outcomes Matrix (AI-Powered)**

**What it is:** An AI-generated learning outcomes analysis. One-click triggers the Education agent to design a detailed outcomes matrix mapping modules to skills, knowledge, and behaviors.

**How it works:**

Shows the prompt: "Design a learning outcomes matrix for my Content Marketing Mastery course..."

"Run AI Analysis" button sends the prompt to the Education agent with full course context

Response renders as a formatted text block

**Module 7.3: Cohort / Enrollment Health Dashboard**

**What it is:** A dashboard showing the commercial and operational health of each training cohort or program intake.

**How it works:**

Each cohort card shows: cohort name, seats sold / total capacity, revenue, start date, status pill, and overall health score

Risk indicators flag low fill rate, high refund exposure, and weak completion outlook

A utilization bar visualizes how full each cohort is

Top KPI cards show: Total Seats Sold, Capacity Filled %, Booked Revenue, and At-Risk Cohorts

**Interactive elements:**

Inline editing for cohort name and revenue

Seat counters update sold / capacity numbers

Status pill toggle - Planning / Selling / Running / Completed

Risk flag toggle for refund risk and completion risk

"Add Cohort" button - creates a new cohort card

**Pre-loaded data:**

2 cohorts: Content Marketing Mastery Q2 (18/25 seats sold, healthy) and Agency Growth Blueprint Q2 (6/20 seats sold, at risk)

**Use cases:** Monitor enrollment performance, decide when to push marketing harder, detect weak cohorts early.

**DOMAIN 8: ⏰ TIME ORCHESTRATOR**

**Agent Color:** Orange (#fb923c)

**Subtitle:** Priorities · Schedule · Deadlines

Folded Card Quick View

What should appear when folded:

• Overdue tasks count

• Total priority hours this week

• Next leadership meeting

• Missed cadence items count

• Health pill derived from overdue load + leadership rhythm health

**Module 8.1: Eisenhower Matrix**

**What it is:** A complete time management system that auto-sorts tasks from ALL domains into a 4-quadrant priority matrix with KPIs and time allocation analysis.

**Top KPI bar (4 cards):**

Total Task Time (hours + minutes)

Overdue count (red)

Completed count (green)

Active domains count

**Eisenhower 2×2 Grid:**

DO NOW (urgent + important, red): Tasks with urgency ≥7 AND importance ≥7

SCHEDULE (not urgent + important, indigo): Urgency <7, Importance ≥7

DELEGATE (urgent + not important, yellow): Urgency ≥7, Importance <7

ELIMINATE (not urgent + not important, gray): Both <7

Each task shows: checkbox (mark done), task name, domain pill (color-coded to that domain), time estimate pill, OVERDUE badge if past due.

**Domain Time Allocation:**

Horizontal bar chart showing how many hours are allocated to each domain

Bars colored to match each domain's theme color

Sorted by time descending

**Task Editor (below matrix):**

Full task list sorted by urgency×importance score (highest first)

Each task row has: completion checkbox, editable name, domain dropdown, urgency slider (1-10, red), importance slider (1-10, indigo), time estimate (minutes input), delete button

"Add Task" button - creates new task

"AI Prioritize" button - sends entire task list to Orchestrator agent for a battle plan

**Pre-loaded data:** 5 tasks across sales, content, education, people, and finance domains with varied urgency/importance scores and due dates.

**Module 8.2: Leadership Rhythm Planner**

**What it is:** A recurring management cadence planner for the CEO and leadership team.

**How it works:**

Meetings are grouped by rhythm: Weekly, Monthly, Quarterly

Each meeting row shows: meeting name, owner, participants, purpose, duration, next date, and status

Status states: Scheduled, Missed, Done, Needs Reschedule

A cadence health bar shows how much of the core management rhythm is currently scheduled and on track

The planner makes invisible management work visible - especially reviews that are slipping or missing entirely

**Interactive elements:**

"Add Recurring Meeting" button - creates a new meeting row

Frequency dropdown - Weekly / Monthly / Quarterly

Date picker for next occurrence

Status toggle buttons per row

Inline editing for owner, participants, and purpose

Filter toggle - show only missed or upcoming meetings

**Pre-loaded data:**

5 recurring meetings: Weekly Leadership Meeting, Sales Forecast Review, Finance Review, Hiring Review, and Strategic Review

**Use cases:** Build a reliable executive cadence, prevent important reviews from disappearing, improve management discipline across domains.

**CROSS-DOMAIN: 🧩 CUSTOM BLOCKS**

Available in every domain as the last tab. Allows building custom tools from 12 block types:

**Block Types:**

| **#** | **Type**    | **Description**            | **Key Features**                                                                    |
| ----- | ----------- | -------------------------- | ----------------------------------------------------------------------------------- |
| 1     | Table       | Rows & columns spreadsheet | Add/remove rows and columns, editable headers, row delete                           |
| 2     | Checklist   | Completion tracker         | Progress bar, completion count, checkboxes, strike-through on done                  |
| 3     | Kanban      | Card columns board         | Renamable columns, add cards, add columns, per-card delete                          |
| 4     | Scorecard   | Metrics vs targets         | Editable value/target inputs, progress bars, % calculation, color-coded             |
| 5     | SWOT        | 4-quadrant analysis        | Color-coded cells (S=green, W=red, O=indigo, T=yellow), free-text per cell          |
| 6     | Tracker     | Numbers over time          | Mini bar chart, latest/average/trend stats, goal line, add entries with label+value |
| 7     | Pros & Cons | Weighted comparison        | 5-bar weight per item, auto-calculated pro/con scores, DO IT/DON'T/TIE verdict      |
| 8     | Habit Grid  | Weekly habits              | Mon-Sun grid, per-habit %, overall %, reset week button, add habits                 |
| 9     | Process     | Step-by-step flow          | Vertical flow with numbered dots, click to complete, notes per step, % complete     |
| 10    | 2×2 Matrix  | Custom quadrant grid       | Editable axis labels, editable quadrant names, add items to any quadrant            |
| 11    | Timeline    | Milestone tracker          | Vertical timeline, date picker, status cycle (pending→active→done→blocked), notes   |
| 12    | AI Prompt   | Saved AI command           | Write any prompt, toggle context inclusion, run button, persistent result display   |

**Shared features across all blocks:**

Editable block name (click to rename)

Type badge

Duplicate button (creates a copy)

Delete button

All data persists across sessions

**AI INTEGRATION**

**Per-Domain AI Agent**

Each domain has a chat sidebar accessible via the "AI" button in the top bar. The agent:

Has a specialized system prompt for that domain

Receives the full app data snapshot as context

Can reference team members, pipeline deals, client data, etc. in its answers

Supports conversation history within the session

**AI-Powered Modules**

Several modules have direct AI integration buttons:

BMC → "AI Analyze" (sends canvas to Strategy agent)

Hook Bank → "AI Generate" (generates 5 new hooks via Brand agent)

Time Orchestrator → "AI Prioritize" (generates daily battle plan)

Education Outcomes → "Run AI Analysis" (designs learning outcomes matrix)

Custom AI Prompt blocks → "Run" (executes any saved prompt with optional context)

**Cross-Domain Intelligence**

The Orchestrator agent sees data from ALL domains simultaneously. Its system prompt explicitly instructs it to prioritize ruthlessly, protect CEO time at \$500/hr, batch similar work, flag conflicts, and create battle plans based on the full cross-domain picture.

**DATA PERSISTENCE**

All data is stored via window.storage (artifact persistent storage) under the key sb3. This includes: OKRs, team data, delegation items, pipeline deals, content pipeline, content scores, ideas, hook bank, authority metrics, client data, expenses, courses, tasks, custom blocks, and chat history. Data persists across sessions and page reloads.

**TECHNICAL NOTES**

**Framework:** React with hooks (useState, useEffect, useRef, useCallback)

**Styling:** Inline CSS with glassmorphism dark theme

**Icons:** Lucide React icon library

**AI Model:** Claude Sonnet (claude-sonnet-4-20250514) via Anthropic API

**Charts:** SVG (radar chart rendered with computed polygon points)

No external dependencies beyond React and Lucide
