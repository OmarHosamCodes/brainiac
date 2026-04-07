# Brainiac Block Optimization Spec

## Objective

Optimize every workspace block editor in Brainiac Studio using the combined lenses of:

- `@.agents/skills/optimize`
- `@.agents/skills/clarify`
- `@.agents/skills/polish`

This document is the **pre-execution plan**. No code changes are included here. It defines:

- the audit framework
- the quality rating for each block
- the implementation priority
- the intended changes for each block
- the recommended execution order

---

## Audit Framework

Each block was evaluated across three dimensions:

1. **Optimize**
   - rendering cost
   - repeated computation
   - dense or inefficient template patterns
   - async/loading behavior
   - interaction performance

2. **Clarify**
   - label clarity
   - action clarity
   - empty/error/success guidance
   - information hierarchy
   - executive scanability

3. **Polish**
   - spacing and alignment consistency
   - interaction states
   - hover/focus accessibility
   - visual hierarchy
   - consistency with Brainiac’s brand system

### Rating Scale

- `9–10` = excellent, nearly ship-ready
- `7–8` = strong, but with targeted improvements needed
- `5–6` = meaningful redesign or structural cleanup needed

### Priority Scale

- `P0` = must address first
- `P1` = high-value improvements after P0
- `P2` = refinement and consistency pass
- `P3` = optional minor touch-ups

---

## Product and Design Context

### Users

- CEOs
- project managers
- team leaders

These users open Brainiac Studio during focused work sessions for planning, reviewing progress, mapping knowledge, and collaborating with AI agents.

### Brand Personality

- Intelligent
- Focused
- Collaborative

### Experience Goals

- clarity over noise
- speed over ceremony
- polished but not flashy
- calm, spatial, trustworthy UI
- accessible by default

### Design Direction

- emerald primary
- zinc neutrals
- rounded shape language
- glass-morphism workspace feel
- subtle motion only
- dark mode first-class
- no enterprise density
- no toy-like interactions
- no overdesigned AI aesthetics

---

## System-Wide Improvements

These changes should be applied across the block system before or alongside individual block updates.

### 1. Reduce inline mutation noise

Many block editors appear to rely on repeated inline update handlers. Refactor common update patterns into reusable helpers or composables to improve:

- maintainability
- readability
- consistency
- long-term performance hygiene

### 2. Remove hover-only dependence

Important actions should not be discoverable only on hover. Ensure primary and destructive actions are:

- visible when appropriate
- focus-accessible
- keyboard-accessible
- understandable on touch devices

### 3. Standardize async states

Each block should have consistent handling for:

- loading
- empty
- error
- success

States should be informative, calm, and action-oriented.

### 4. Improve executive scanability

Blocks should help leadership users answer questions quickly:

- What matters?
- What changed?
- What needs attention?
- What should I do next?

This means reducing unnecessary density and surfacing key insights earlier.

### 5. Strengthen accessibility

Across all blocks:

- improve focus states
- avoid color-only meaning
- improve contrast
- support reduced motion
- improve semantic structure
- strengthen mobile and keyboard usage

### 6. Standardize copy and terminology

Unify:

- labels
- state language
- action labels
- units
- currency usage
- status naming

Copy should feel precise, calm, and human.

---

## Block-by-Block Plan

### Phase 1 — P0

| Block                     | Rating | Priority | What will change                                                                                                                                |
| ------------------------- | -----: | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom                    | 5.5/10 |    P0    | Modernize legacy form patterns, unify styling, and add missing AI/run/error polish.                                                             |
| Profitability & Cash Flow | 6.0/10 |    P0    | Redesign from dense snapshot to decision-first cash-flow view; simplify layout and connect profitability, timing, and collections more clearly. |
| 9-box Talent Grid         | 6.0/10 |    P0    | Replace harsh or judgmental labels, make the model more developmental and collaborative, and simplify the split grid/editor experience.         |
| Authority Scorecard       | 6.2/10 |    P0    | Remove nested interactive conflicts, prevent accidental actions, and separate quick-add from editing more clearly.                              |
| Eisenhower Matrix         | 6.5/10 |    P0    | Simplify the multi-panel experience, remove duplicated task surfaces, and make prioritization flow clearer and faster.                          |

---

### Phase 2 — P1

| Block                     | Rating | Priority | What will change                                                                                                        |
| ------------------------- | -----: | :------: | ----------------------------------------------------------------------------------------------------------------------- |
| Kanban                    | 6.5/10 |    P1    | Reduce per-column filtering cost, improve keyboard-safe drag behavior, and declutter card chrome.                       |
| Time Orchestrator         | 6.5/10 |    P1    | Reduce dashboard density, tighten filter-to-action hierarchy, and surface next actions faster.                          |
| Content ROI Tracker       | 6.9/10 |    P1    | Simplify the very wide table, reduce repeated status and score recompute, and make ROI decisions easier to scan.        |
| Agency Project Manager    | 7.0/10 |    P1    | Add stronger loading, empty, and error states, improve filter and list clarity, and expose richer management actions.   |
| Decision Matrix           | 7.0/10 |    P1    | Reduce matrix density, clarify weights and score impact, and clean up repeated cell update logic.                       |
| Deal Scoring Matrix       | 7.0/10 |    P1    | Clarify why deals rank where they do, reduce card and control overload, and make score signals more actionable.         |
| Forecast Confidence Board | 7.0/10 |    P1    | Tone down visual chrome, remove hover dependence, and simplify card editing for keyboard and mobile use.                |
| Collections Tracker       | 7.0/10 |    P1    | Break spreadsheet feel, surface risk-first grouping, reduce repeated row calculations, and improve responsiveness.      |
| Skills Heat Map           | 7.0/10 |    P1    | Replace cycle-only scoring with clearer accessible inputs, cache averages, and improve table readability.               |
| Scorecard                 | 7.0/10 |    P1    | Stop hiding controls on hover, clarify targets and units, and strengthen status readability.                            |
| Tracker                   | 7.0/10 |    P1    | Clarify chart labels and goal lines, reduce tooltip dependence, and improve timeline meaning.                           |
| Pros & Cons               | 7.0/10 |    P1    | Replace tiny weight pills with more accessible scoring and add clearer decision guidance.                               |
| 2x2 Matrix                | 7.0/10 |    P1    | Make axes and quadrants more legible, reduce duplicate chrome, and strengthen the matrix framing.                       |
| Timeline                  | 7.0/10 |    P1    | Improve date and status scanability, reduce hover-only controls, and respect reduced motion more consistently.          |
| Leadership Rhythm Planner | 7.0/10 |    P1    | Compress card density, elevate missed and upcoming signals, and speed up cadence scanning.                              |
| Decision                  | 7.0/10 |    P1    | Make weighting more accessible, clarify recommendation signals, and reduce color-only meaning.                          |
| Hook Bank                 | 7.1/10 |    P1    | Replace tiny score bars with accessible rating controls, surface actions without hover, and sharpen AI result feedback. |
| Agency Time Entries Log   | 7.1/10 |    P1    | Add time validation, improve pagination and filter ergonomics, and strengthen empty and error states.                   |
| Agency Sprint Board       | 7.2/10 |    P1    | Improve board interaction model, make movement and editing clearer, and add better operational states.                  |
| Content Quality Radar     | 7.4/10 |    P1    | Make labels and benchmarks more legible, add plain-language interpretation, and improve chart accessibility context.    |
| Table                     | 7.5/10 |    P1    | Extract cell and column handlers, improve semantics, and sharpen row and empty-state clarity.                           |
| Habit Grid                | 7.5/10 |    P1    | Add labeled day toggles, soften destructive reset actions, and improve mobile and table readability.                    |
| AI Prompt                 | 7.5/10 |    P1    | Add better prompt scaffolding and output structure, improve trust cues, and reduce history density.                     |
| Task List                 | 7.5/10 |    P1    | Improve quick-scan metadata, reduce hidden controls, and simplify expanded editing.                                     |
| Course Roadmap            | 7.6/10 |    P1    | Reduce duplicate lesson UI, cache repeated progress derivations, and clarify course status and progress flow.           |
| Agency Time Tracker       | 7.7/10 |    P1    | Clarify active-timer state, improve async feedback, and polish task and context switching.                              |
| Content Pipeline          | 7.8/10 |    P1    | Tighten drag-and-drop accessibility, clarify platform and status cues, and reduce card scan friction.                   |
| Agency Time Reports       | 8.0/10 |    P1    | Strengthen executive summaries and trends, improve permission and filter feedback, and polish report and export flow.   |

---

### Phase 3 — P2

| Block                    | Rating | Priority | What will change                                                                                                       |
| ------------------------ | -----: | :------: | ---------------------------------------------------------------------------------------------------------------------- |
| OKR Tracker              | 8.0/10 |    P2    | Cache progress and health calculations, reduce repeated lookups, and improve KR scanability and slider accessibility.  |
| Business Model Canvas    | 8.0/10 |    P2    | Make missing-cell guidance more actionable, improve analysis hierarchy, and tighten canvas scanning.                   |
| Assumption Tracker       | 8.0/10 |    P2    | Surface review urgency and ownership more clearly, simplify controls, and trim repeated filter and count work.         |
| Pipeline Funnel          | 8.0/10 |    P2    | Sharpen stage labeling, improve funnel readability, and lighten quick-edit row density.                                |
| Pricing Simulator        | 8.0/10 |    P2    | Tighten control ergonomics, clarify units and presets, and make scenarios more executive-decision oriented.            |
| Delegation Matrix        | 8.0/10 |    P2    | Standardize currency and context, improve sorting and filtering by delegation state, and clarify owner handoffs.       |
| Seat Planner             | 8.0/10 |    P2    | Reduce table density, strengthen uncovered and backup cues, and improve filter-to-action clarity.                      |
| Checklist                | 8.0/10 |    P2    | Make actions visible on focus, strengthen empty states, and improve completion and accessibility cues.                 |
| SWOT                     | 8.0/10 |    P2    | Normalize token usage, improve contrast consistency, and add clearer strategic prompting.                              |
| Process                  | 8.0/10 |    P2    | Tighten step hierarchy, clarify completion states, and clean up step management interactions.                          |
| Notes                    | 8.0/10 |    P2    | Clarify edit and preview copy, align typography more closely with brand, and polish preview state.                     |
| Message House            | 8.1/10 |    P2    | Improve hierarchy between promise, pillars, and proof, make stress-test output easier to scan, and polish readability. |
| Cohort Health Dashboard  | 8.2/10 |    P2    | Tone down full-card status tinting, surface top risks and actions first, and improve health and financial readability. |
| Learning Outcomes Matrix | 7.8/10 |    P2    | Make AI output easier to skim, clarify current vs history, and soften auto-selection side effects.                     |

---

## Full Inventory Checklist

This is the complete intended coverage set for execution:

- Workspace2x2MatrixBlockEditor
- WorkspaceAgencyProjectManagerBlockEditor
- WorkspaceAgencySprintBoardBlockEditor
- WorkspaceAgencyTimeEntriesLogBlockEditor
- WorkspaceAgencyTimeReportsBlockEditor
- WorkspaceAgencyTimeTrackerBlockEditor
- WorkspaceAiPromptBlockEditor
- WorkspaceAssumptionTrackerBlockEditor
- WorkspaceAuthorityScorecardBlockEditor
- WorkspaceBusinessModelCanvasBlockEditor
- WorkspaceChecklistBlockEditor
- WorkspaceCohortHealthDashboardBlockEditor
- WorkspaceCollectionsTrackerBlockEditor
- WorkspaceContentPipelineBlockEditor
- WorkspaceContentQualityRadarBlockEditor
- WorkspaceContentRoiTrackerBlockEditor
- WorkspaceCourseRoadmapBlockEditor
- WorkspaceCustomBlockEditor
- WorkspaceDealScoringMatrixBlockEditor
- WorkspaceDecisionBlockEditor
- WorkspaceDecisionMatrixBlockEditor
- WorkspaceDelegationMatrixBlockEditor
- WorkspaceEisenhowerMatrixBlockEditor
- WorkspaceForecastConfidenceBoardBlockEditor
- WorkspaceHabitGridBlockEditor
- WorkspaceHookBankBlockEditor
- WorkspaceKanbanBlockEditor
- WorkspaceLeadershipRhythmPlannerBlockEditor
- WorkspaceLearningOutcomesMatrixBlockEditor
- WorkspaceMessageHouseBlockEditor
- WorkspaceNotesBlockEditor
- WorkspaceOkrTrackerBlockEditor
- WorkspacePipelineFunnelBlockEditor
- WorkspacePricingSimulatorBlockEditor
- WorkspaceProcessBlockEditor
- WorkspaceProfitabilityCashFlowBlockEditor
- WorkspaceProsConsBlockEditor
- WorkspaceScorecardBlockEditor
- WorkspaceSeatPlannerBlockEditor
- WorkspaceSkillsHeatMapBlockEditor
- WorkspaceSwotBlockEditor
- WorkspaceTableBlockEditor
- WorkspaceTalentGridBlockEditor
- WorkspaceTaskListBlockEditor
- WorkspaceTimeOrchestratorBlockEditor
- WorkspaceTimelineBlockEditor
- WorkspaceTrackerBlockEditor

---

## Recommended Execution Order

### Wave A — Foundation

Apply global system changes first:

- shared update helpers
- state handling patterns
- accessibility and focus conventions
- copy conventions
- action visibility rules
- layout density rules

### Wave B — P0 redesigns

1. Custom
2. Eisenhower Matrix
3. Profitability & Cash Flow
4. 9-box Talent Grid
5. Authority Scorecard

### Wave C — highest ROI P1 blocks

Suggested first group:

1. Agency Project Manager
2. Content ROI Tracker
3. Kanban
4. Time Orchestrator
5. Decision Matrix
6. Deal Scoring Matrix
7. Collections Tracker
8. Skills Heat Map
9. Timeline
10. Task List

### Wave D — remaining P1

Execute the rest of the P1 group once the highest-value usability improvements are in place.

### Wave E — P2 refinement pass

Use this wave for consistency, polish, readability, and executive-level scanability improvements across already-strong blocks.

---

## Definition of Done

A block is considered complete when:

- repeated update logic is simplified or standardized
- important actions are not hover-only
- labels and states are clear
- empty, loading, error, and success states are handled
- layout density is appropriate for leadership users
- interaction states are polished
- accessibility is materially improved
- terminology and visual tone match Brainiac’s brand
- the block feels calm, capable, and intentional

---

## Final Recommendation

Execute in this order:

1. system-wide foundations
2. all P0 blocks
3. top P1 blocks
4. remaining P1 blocks
5. final P2 polish sweep

This approach will produce the highest leverage outcome while keeping the block system consistent and maintainable.
