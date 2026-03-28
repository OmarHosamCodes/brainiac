import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
} from "./constants";
import {
  workspaceAiPromptBlockSchema,
  workspaceAssumptionTrackerBlockSchema,
  workspaceBusinessModelCanvasBlockSchema,
  workspaceCustomBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceDealScoringDealSchema,
  workspaceDealScoringMatrixBlockSchema,
  workspaceDelegationItemSchema,
  workspaceDelegationMatrixBlockSchema,
  workspaceDecisionMatrixBlockSchema,
  workspaceDecisionMatrixCriterionSchema,
  workspaceDecisionMatrixOptionSchema,
  workspaceDecisionBlockSchema,
  workspaceForecastConfidenceBoardBlockSchema,
  workspaceForecastConfidenceItemSchema,
  workspaceKanbanBlockSchema,
  workspaceKanbanCardSchema,
  workspaceKanbanColumnSchema,
  workspaceNodeDashboardSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeViewStateSchema,
  workspaceNotesBlockSchema,
  workspaceOkrKeyResultSchema,
  workspaceOkrObjectiveSchema,
  workspaceOkrTrackerBlockSchema,
  workspacePipelineFunnelBlockSchema,
  workspacePipelineFunnelDealSchema,
  workspacePromptOutputSchema,
  workspaceSeatPlannerBlockSchema,
  workspaceSeatPlannerSeatSchema,
  workspaceScorecardBlockSchema,
  workspaceScorecardMetricSchema,
  workspaceSkillsHeatMapBlockSchema,
  workspaceSkillsHeatMapMemberSchema,
  workspaceStrategicAssumptionSchema,
  workspaceTaskListBlockSchema,
  workspaceTaskSchema,
  workspaceTalentGridBlockSchema,
  workspaceTalentGridMemberSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceTimelineBlockSchema,
  workspaceTimelineMilestoneSchema,
  workspaceTrackerBlockSchema,
} from "./schemas";
import { createWorkspaceSkillsScoreMap } from "./people";
import { getNowIsoString } from "./shared";
import { createWorkspaceTimeOrchestratorSettings } from "./tasks";
import type {
  WorkspaceAiPromptBlock,
  WorkspaceAssumptionTrackerBlock,
  WorkspaceBusinessModelCanvasBlock,
  WorkspaceBlock,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockField,
  WorkspaceCustomBlockTemplate,
  WorkspaceDealScoringDeal,
  WorkspaceDealScoringMatrixBlock,
  WorkspaceDelegationItem,
  WorkspaceDelegationMatrixBlock,
  WorkspaceDecisionMatrixBlock,
  WorkspaceDecisionMatrixCriterion,
  WorkspaceDecisionMatrixOption,
  WorkspaceDecisionBlock,
  WorkspaceForecastConfidenceBoardBlock,
  WorkspaceForecastConfidenceItem,
  WorkspaceKanbanBlock,
  WorkspaceKanbanCard,
  WorkspaceKanbanColumn,
  WorkspaceNode,
  WorkspaceNodeDashboard,
  WorkspaceNodeTab,
  WorkspaceNodeViewState,
  WorkspaceNotesBlock,
  WorkspacePipelineFunnelBlock,
  WorkspacePipelineFunnelDeal,
  WorkspacePromptOutput,
  WorkspaceSeatPlannerBlock,
  WorkspaceSeatPlannerSeat,
  WorkspaceOkrKeyResult,
  WorkspaceOkrObjective,
  WorkspaceOkrTrackerBlock,
  WorkspaceScorecardBlock,
  WorkspaceScorecardMetric,
  WorkspaceSkillsHeatMapBlock,
  WorkspaceSkillsHeatMapMember,
  WorkspaceStrategicAssumption,
  WorkspaceTask,
  WorkspaceTaskListBlock,
  WorkspaceTalentGridBlock,
  WorkspaceTalentGridMember,
  WorkspaceTimeOrchestratorBlock,
  WorkspaceTimelineBlock,
  WorkspaceTimelineMilestone,
  WorkspaceTrackerBlock,
} from "./types";

export * from "./constants";
export * from "./dashboard";
export * from "./people";
export * from "./sales";
export * from "./schemas";
export * from "./strategy";
export * from "./tasks";
export * from "./types";

export function createWorkspaceId(prefix = "item") {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkspaceTask(partial: Partial<WorkspaceTask> = {}): WorkspaceTask {
  return workspaceTaskSchema.parse({
    id: partial.id ?? createWorkspaceId("task"),
    text: partial.text ?? "New task",
    completed: partial.completed ?? false,
    dueDate: partial.dueDate ?? null,
    priority: partial.priority ?? "medium",
    domain: partial.domain ?? null,
    urgency: partial.urgency ?? 5,
    importance: partial.importance ?? 5,
    estimateMinutes: partial.estimateMinutes ?? 30,
  });
}

export function createWorkspaceSkillsHeatMapMember(
  partial: Partial<WorkspaceSkillsHeatMapMember> = {},
): WorkspaceSkillsHeatMapMember {
  return workspaceSkillsHeatMapMemberSchema.parse({
    id: partial.id ?? createWorkspaceId("person"),
    name: partial.name ?? "New team member",
    role: partial.role ?? "",
    scores: createWorkspaceSkillsScoreMap(partial.scores),
  });
}

export function createWorkspaceDelegationItem(
  partial: Partial<WorkspaceDelegationItem> = {},
): WorkspaceDelegationItem {
  return workspaceDelegationItemSchema.parse({
    id: partial.id ?? createWorkspaceId("delegation"),
    task: partial.task ?? "Task to delegate",
    from: partial.from ?? "Ahmed",
    to: partial.to ?? "",
    hoursPerWeek: partial.hoursPerWeek ?? 2,
    status: partial.status ?? "stuck",
  });
}

export function createWorkspaceDealScoringDeal(
  partial: Partial<WorkspaceDealScoringDeal> = {},
): WorkspaceDealScoringDeal {
  return workspaceDealScoringDealSchema.parse({
    id: partial.id ?? createWorkspaceId("deal"),
    clientName: partial.clientName ?? "New deal",
    valueEgp: partial.valueEgp ?? 0,
    temperature: partial.temperature ?? "warm",
    score: partial.score ?? 50,
    stage: partial.stage ?? "lead",
    nextAction: partial.nextAction ?? "",
    dueDate: partial.dueDate ?? null,
  });
}

export function createWorkspacePipelineFunnelDeal(
  partial: Partial<WorkspacePipelineFunnelDeal> = {},
): WorkspacePipelineFunnelDeal {
  return workspacePipelineFunnelDealSchema.parse({
    id: partial.id ?? createWorkspaceId("funnel-deal"),
    clientName: partial.clientName ?? "New deal",
    valueEgp: partial.valueEgp ?? 0,
    temperature: partial.temperature ?? "warm",
    stage: partial.stage ?? "lead",
  });
}

export function createWorkspaceForecastConfidenceItem(
  partial: Partial<WorkspaceForecastConfidenceItem> = {},
): WorkspaceForecastConfidenceItem {
  return workspaceForecastConfidenceItemSchema.parse({
    id: partial.id ?? createWorkspaceId("forecast"),
    clientName: partial.clientName ?? "New forecast deal",
    valueEgp: partial.valueEgp ?? 0,
    bucket: partial.bucket ?? "likely",
    expectedCloseMonth: partial.expectedCloseMonth ?? null,
    confidence: partial.confidence ?? 50,
    owner: partial.owner ?? "",
    nextAction: partial.nextAction ?? "",
  });
}

export function createWorkspaceTalentGridMember(
  partial: Partial<WorkspaceTalentGridMember> = {},
): WorkspaceTalentGridMember {
  return workspaceTalentGridMemberSchema.parse({
    id: partial.id ?? createWorkspaceId("talent"),
    name: partial.name ?? "New team member",
    role: partial.role ?? "",
    performance: partial.performance ?? 3,
    potential: partial.potential ?? 3,
  });
}

export function createWorkspaceSeatPlannerSeat(
  partial: Partial<WorkspaceSeatPlannerSeat> = {},
): WorkspaceSeatPlannerSeat {
  return workspaceSeatPlannerSeatSchema.parse({
    id: partial.id ?? createWorkspaceId("seat"),
    name: partial.name ?? "Critical seat",
    owner: partial.owner ?? "",
    function: partial.function ?? "",
    health: partial.health ?? "strong",
    load: partial.load ?? "balanced",
    backupOwner: partial.backupOwner ?? "",
    notes: partial.notes ?? "",
  });
}

export function createWorkspaceKanbanColumn(
  partial: Partial<WorkspaceKanbanColumn> = {},
): WorkspaceKanbanColumn {
  return workspaceKanbanColumnSchema.parse({
    id: partial.id ?? createWorkspaceId("column"),
    title: partial.title ?? "New column",
  });
}

export function createWorkspaceKanbanCard(
  partial: Partial<WorkspaceKanbanCard> & { columnId: string },
): WorkspaceKanbanCard {
  return workspaceKanbanCardSchema.parse({
    id: partial.id ?? createWorkspaceId("card"),
    title: partial.title ?? "New card",
    description: partial.description ?? "",
    columnId: partial.columnId,
    assignee: partial.assignee ?? "",
    dueDate: partial.dueDate ?? null,
  });
}

export function createWorkspaceTimelineMilestone(
  partial: Partial<WorkspaceTimelineMilestone> = {},
): WorkspaceTimelineMilestone {
  return workspaceTimelineMilestoneSchema.parse({
    id: partial.id ?? createWorkspaceId("milestone"),
    title: partial.title ?? "Milestone",
    date: partial.date ?? null,
    status: partial.status ?? "planned",
    note: partial.note ?? "",
  });
}

export function createWorkspaceScorecardMetric(
  partial: Partial<WorkspaceScorecardMetric> = {},
): WorkspaceScorecardMetric {
  return workspaceScorecardMetricSchema.parse({
    id: partial.id ?? createWorkspaceId("metric"),
    label: partial.label ?? "Metric",
    value: partial.value ?? 0,
    target: partial.target ?? 100,
    unit: partial.unit ?? "",
  });
}

export function createWorkspaceOkrKeyResult(
  partial: Partial<WorkspaceOkrKeyResult> = {},
): WorkspaceOkrKeyResult {
  return workspaceOkrKeyResultSchema.parse({
    id: partial.id ?? createWorkspaceId("key-result"),
    title: partial.title ?? "New key result",
    progress: partial.progress ?? 0,
  });
}

export function createWorkspaceOkrObjective(
  partial: Partial<WorkspaceOkrObjective> = {},
): WorkspaceOkrObjective {
  return workspaceOkrObjectiveSchema.parse({
    id: partial.id ?? createWorkspaceId("objective"),
    title: partial.title ?? "New objective",
    keyResults: partial.keyResults ?? [],
  });
}

export function createWorkspaceDecisionMatrixCriterion(
  partial: Partial<WorkspaceDecisionMatrixCriterion> = {},
): WorkspaceDecisionMatrixCriterion {
  return workspaceDecisionMatrixCriterionSchema.parse({
    id: partial.id ?? createWorkspaceId("criterion"),
    label: partial.label ?? "New criterion",
    weight: partial.weight ?? 5,
  });
}

export function createWorkspaceDecisionMatrixOption(
  partial: Partial<WorkspaceDecisionMatrixOption> = {},
): WorkspaceDecisionMatrixOption {
  return workspaceDecisionMatrixOptionSchema.parse({
    id: partial.id ?? createWorkspaceId("option"),
    label: partial.label ?? "Option",
    scores: partial.scores ?? {},
  });
}

export function createWorkspaceStrategicAssumption(
  partial: Partial<WorkspaceStrategicAssumption> = {},
): WorkspaceStrategicAssumption {
  return workspaceStrategicAssumptionSchema.parse({
    id: partial.id ?? createWorkspaceId("assumption"),
    statement: partial.statement ?? "New assumption",
    linkType: partial.linkType ?? "none",
    linkId: partial.linkId ?? null,
    owner: partial.owner ?? "",
    reviewDate: partial.reviewDate ?? null,
    confidence: partial.confidence ?? 3,
    status: partial.status ?? "validating",
    evidenceNotes: partial.evidenceNotes ?? "",
  });
}

function getDecisionMatrixDefaultCriteria() {
  return [
    createWorkspaceDecisionMatrixCriterion({
      label: "Revenue Impact",
      weight: 5,
    }),
    createWorkspaceDecisionMatrixCriterion({
      label: "Time to Execute",
      weight: 3,
    }),
    createWorkspaceDecisionMatrixCriterion({
      label: "Risk Level",
      weight: 4,
    }),
  ];
}

function createDecisionMatrixScoreMap(
  criteria: WorkspaceDecisionMatrixCriterion[],
  scores: number[],
) {
  return Object.fromEntries(criteria.map((criterion, index) => [criterion.id, scores[index] ?? 5]));
}

function getBusinessModelCanvasDefaultCells() {
  return {
    keyPartners: "",
    keyActivities:
      "Deliver cohort-based practical marketing programs\nPublish authority-building content each week\nRun conversion-focused consulting and advisory sessions",
    keyResources: "",
    valuePropositions:
      "Practical senior-level marketing training with real case studies\nClearer execution systems for operators, founders, and teams",
    customerRelationships: "",
    channels: "",
    customerSegments: "",
    costStructure: "",
    revenueStreams: "",
  } satisfies WorkspaceBusinessModelCanvasBlock["cells"];
}

function getSkillsHeatMapDefaultMembers() {
  return [
    createWorkspaceSkillsHeatMapMember({
      name: "Sarah",
      role: "Content Strategist",
      scores: {
        writing: 9,
        strategy: 7,
        design: 5,
        analytics: 6,
        leadership: 6,
      },
    }),
    createWorkspaceSkillsHeatMapMember({
      name: "Omar",
      role: "Growth Lead",
      scores: {
        writing: 7,
        strategy: 9,
        design: 4,
        analytics: 8,
        leadership: 7,
      },
    }),
    createWorkspaceSkillsHeatMapMember({
      name: "Nour",
      role: "Designer",
      scores: {
        writing: 5,
        strategy: 6,
        design: 9,
        analytics: 5,
        leadership: 6,
      },
    }),
    createWorkspaceSkillsHeatMapMember({
      name: "Karim",
      role: "Analyst",
      scores: {
        writing: 4,
        strategy: 7,
        design: 3,
        analytics: 9,
        leadership: 5,
      },
    }),
    createWorkspaceSkillsHeatMapMember({
      name: "Layla",
      role: "Operations Manager",
      scores: {
        writing: 6,
        strategy: 8,
        design: 4,
        analytics: 7,
        leadership: 9,
      },
    }),
  ];
}

function getDelegationMatrixDefaultItems() {
  return [
    createWorkspaceDelegationItem({
      task: "Social scheduling",
      from: "Ahmed",
      to: "Sarah",
      hoursPerWeek: 3,
      status: "stuck",
    }),
    createWorkspaceDelegationItem({
      task: "Client reporting",
      from: "Ahmed",
      to: "Karim",
      hoursPerWeek: 5,
      status: "stuck",
    }),
    createWorkspaceDelegationItem({
      task: "Content approvals",
      from: "Ahmed",
      to: "Layla",
      hoursPerWeek: 4,
      status: "transitioning",
    }),
  ];
}

function getDealScoringMatrixDefaultDeals() {
  return [
    createWorkspaceDealScoringDeal({
      clientName: "TechCo",
      valueEgp: 15_000,
      temperature: "hot",
      score: 82,
      stage: "consultation",
      nextAction: "Send revised scope after the discovery call.",
      dueDate: "2026-04-03",
    }),
    createWorkspaceDealScoringDeal({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      temperature: "warm",
      score: 55,
      stage: "lead",
      nextAction: "Book intro call with the brand manager.",
      dueDate: "2026-04-07",
    }),
    createWorkspaceDealScoringDeal({
      clientName: "EduStart",
      valueEgp: 22_000,
      temperature: "hot",
      score: 90,
      stage: "proposal",
      nextAction: "Push commercial approval and confirm procurement path.",
      dueDate: "2026-04-01",
    }),
  ];
}

function getPipelineFunnelDefaultDeals() {
  return [
    createWorkspacePipelineFunnelDeal({
      clientName: "TechCo",
      valueEgp: 15_000,
      temperature: "hot",
      stage: "consultation",
    }),
    createWorkspacePipelineFunnelDeal({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      temperature: "warm",
      stage: "lead",
    }),
    createWorkspacePipelineFunnelDeal({
      clientName: "EduStart",
      valueEgp: 22_000,
      temperature: "hot",
      stage: "proposal",
    }),
  ];
}

function getForecastConfidenceDefaultItems() {
  return [
    createWorkspaceForecastConfidenceItem({
      clientName: "TechCo",
      valueEgp: 15_000,
      bucket: "commit",
      expectedCloseMonth: "2026-04",
      confidence: 85,
      owner: "Omar",
      nextAction: "Finalize legal redlines and sign the MSA.",
    }),
    createWorkspaceForecastConfidenceItem({
      clientName: "EduStart",
      valueEgp: 22_000,
      bucket: "likely",
      expectedCloseMonth: "2026-05",
      confidence: 70,
      owner: "Layla",
      nextAction: "Secure final buyer approval after budget review.",
    }),
    createWorkspaceForecastConfidenceItem({
      clientName: "FoodBrand",
      valueEgp: 8_000,
      bucket: "at-risk",
      expectedCloseMonth: "2026-04",
      confidence: 35,
      owner: "Sarah",
      nextAction: "Recover the stalled thread with a revised proposal.",
    }),
  ];
}

function getTalentGridDefaultMembers() {
  return [
    createWorkspaceTalentGridMember({
      name: "Sarah",
      role: "Content Strategist",
      performance: 4,
      potential: 5,
    }),
    createWorkspaceTalentGridMember({
      name: "Omar",
      role: "Growth Lead",
      performance: 5,
      potential: 4,
    }),
    createWorkspaceTalentGridMember({
      name: "Nour",
      role: "Designer",
      performance: 4,
      potential: 4,
    }),
    createWorkspaceTalentGridMember({
      name: "Karim",
      role: "Analyst",
      performance: 3,
      potential: 5,
    }),
    createWorkspaceTalentGridMember({
      name: "Layla",
      role: "Operations Manager",
      performance: 3,
      potential: 3,
    }),
  ];
}

function getSeatPlannerDefaultSeats() {
  return [
    createWorkspaceSeatPlannerSeat({
      name: "CEO",
      owner: "Ahmed",
      function: "Vision, capital allocation, key relationships",
      health: "strong",
      load: "overloaded",
      backupOwner: "Layla",
      notes: "Founder is still the escalation path for most cross-functional decisions.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Sales Lead",
      owner: "Omar",
      function: "Pipeline ownership, proposals, weekly forecasting",
      health: "fragile",
      load: "balanced",
      backupOwner: "",
      notes: "Single-threaded sales knowledge and no clear backup for live deals.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Content Lead",
      owner: "Sarah",
      function: "Editorial calendar, distribution, case-study production",
      health: "strong",
      load: "balanced",
      backupOwner: "Nour",
      notes: "Execution is steady and documented.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Operations / PMO",
      owner: "",
      function: "Delivery system, meeting cadence, cross-team follow-through",
      health: "gap",
      load: "balanced",
      backupOwner: "",
      notes: "Critical coordination work is spread informally across the founder and ops support.",
    }),
    createWorkspaceSeatPlannerSeat({
      name: "Finance Admin",
      owner: "Layla",
      function: "Collections, invoices, cash reporting",
      health: "strong",
      load: "balanced",
      backupOwner: "Karim",
      notes: "Stable seat with basic redundancy in place.",
    }),
  ];
}

export function createWorkspaceTaskListBlock(
  partial: Partial<WorkspaceTaskListBlock> = {},
): WorkspaceTaskListBlock {
  const timestamp = getNowIsoString();

  return workspaceTaskListBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "task-list",
    title: partial.title ?? "Task list",
    tasks: partial.tasks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNotesBlock(
  partial: Partial<WorkspaceNotesBlock> = {},
): WorkspaceNotesBlock {
  const timestamp = getNowIsoString();

  return workspaceNotesBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "notes",
    title: partial.title ?? "Notes",
    body: partial.body ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDecisionBlock(
  partial: Partial<WorkspaceDecisionBlock> = {},
): WorkspaceDecisionBlock {
  const timestamp = getNowIsoString();

  return workspaceDecisionBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "decision",
    title: partial.title ?? "Decision",
    pros: partial.pros ?? [],
    cons: partial.cons ?? [],
    recommendation: partial.recommendation ?? "",
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTrackerBlock(
  partial: Partial<WorkspaceTrackerBlock> = {},
): WorkspaceTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "tracker",
    title: partial.title ?? "Tracker",
    entries: partial.entries ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAiPromptBlock(
  partial: Partial<WorkspaceAiPromptBlock> = {},
): WorkspaceAiPromptBlock {
  const timestamp = getNowIsoString();

  return workspaceAiPromptBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "ai-prompt",
    title: partial.title ?? "Prompt",
    prompt: partial.prompt ?? "",
    latestOutput: partial.latestOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimeOrchestratorBlock(
  partial: Partial<WorkspaceTimeOrchestratorBlock> = {},
): WorkspaceTimeOrchestratorBlock {
  const timestamp = getNowIsoString();

  return workspaceTimeOrchestratorBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "time-orchestrator",
    title: partial.title ?? "Time orchestrator",
    settings: createWorkspaceTimeOrchestratorSettings(partial.settings),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceKanbanBlock(
  partial: Partial<WorkspaceKanbanBlock> = {},
): WorkspaceKanbanBlock {
  const timestamp = getNowIsoString();
  const columns =
    partial.columns && partial.columns.length > 0
      ? partial.columns
      : [
          createWorkspaceKanbanColumn({ title: "Backlog" }),
          createWorkspaceKanbanColumn({ title: "In progress" }),
          createWorkspaceKanbanColumn({ title: "Done" }),
        ];

  return workspaceKanbanBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "kanban",
    title: partial.title ?? "Kanban board",
    columns,
    cards: partial.cards ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTimelineBlock(
  partial: Partial<WorkspaceTimelineBlock> = {},
): WorkspaceTimelineBlock {
  const timestamp = getNowIsoString();

  return workspaceTimelineBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "timeline",
    title: partial.title ?? "Timeline",
    milestones: partial.milestones ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceSkillsHeatMapBlock(
  partial: Partial<WorkspaceSkillsHeatMapBlock> = {},
): WorkspaceSkillsHeatMapBlock {
  const timestamp = getNowIsoString();

  return workspaceSkillsHeatMapBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "skills-heat-map",
    title: partial.title ?? "Skills heat map",
    members: partial.members ?? getSkillsHeatMapDefaultMembers(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDelegationMatrixBlock(
  partial: Partial<WorkspaceDelegationMatrixBlock> = {},
): WorkspaceDelegationMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceDelegationMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "delegation-matrix",
    title: partial.title ?? "Delegation matrix",
    hourlyRate: partial.hourlyRate ?? 500,
    items: partial.items ?? getDelegationMatrixDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceTalentGridBlock(
  partial: Partial<WorkspaceTalentGridBlock> = {},
): WorkspaceTalentGridBlock {
  const timestamp = getNowIsoString();

  return workspaceTalentGridBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "talent-grid",
    title: partial.title ?? "9-box talent grid",
    members: partial.members ?? getTalentGridDefaultMembers(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceSeatPlannerBlock(
  partial: Partial<WorkspaceSeatPlannerBlock> = {},
): WorkspaceSeatPlannerBlock {
  const timestamp = getNowIsoString();

  return workspaceSeatPlannerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "seat-planner",
    title: partial.title ?? "Seat ownership planner",
    filter: partial.filter ?? "all",
    seats: partial.seats ?? getSeatPlannerDefaultSeats(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDealScoringMatrixBlock(
  partial: Partial<WorkspaceDealScoringMatrixBlock> = {},
): WorkspaceDealScoringMatrixBlock {
  const timestamp = getNowIsoString();

  return workspaceDealScoringMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "deal-scoring-matrix",
    title: partial.title ?? "Deal scoring matrix",
    deals: partial.deals ?? getDealScoringMatrixDefaultDeals(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspacePipelineFunnelBlock(
  partial: Partial<WorkspacePipelineFunnelBlock> = {},
): WorkspacePipelineFunnelBlock {
  const timestamp = getNowIsoString();

  return workspacePipelineFunnelBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "pipeline-funnel",
    title: partial.title ?? "Pipeline funnel",
    deals: partial.deals ?? getPipelineFunnelDefaultDeals(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceForecastConfidenceBoardBlock(
  partial: Partial<WorkspaceForecastConfidenceBoardBlock> = {},
): WorkspaceForecastConfidenceBoardBlock {
  const timestamp = getNowIsoString();

  return workspaceForecastConfidenceBoardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "forecast-confidence-board",
    title: partial.title ?? "Forecast confidence board",
    targetRevenueEgp: partial.targetRevenueEgp ?? 50_000,
    deals: partial.deals ?? getForecastConfidenceDefaultItems(),
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceScorecardBlock(
  partial: Partial<WorkspaceScorecardBlock> = {},
): WorkspaceScorecardBlock {
  const timestamp = getNowIsoString();

  return workspaceScorecardBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "scorecard",
    title: partial.title ?? "Scorecard",
    metrics: partial.metrics ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceOkrTrackerBlock(
  partial: Partial<WorkspaceOkrTrackerBlock> = {},
): WorkspaceOkrTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceOkrTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "okr-tracker",
    title: partial.title ?? "OKR tracker",
    objectives: partial.objectives ?? [
      createWorkspaceOkrObjective({
        title: "Scale to 250K EGP/month",
        keyResults: [
          createWorkspaceOkrKeyResult({ title: "Close 3 retainers", progress: 33 }),
          createWorkspaceOkrKeyResult({ title: "Average deal size reaches 18K", progress: 60 }),
          createWorkspaceOkrKeyResult({ title: "Keep churn below 10%", progress: 80 }),
        ],
      }),
      createWorkspaceOkrObjective({
        title: "Launch course Q2",
        keyResults: [
          createWorkspaceOkrKeyResult({ title: "Finalize curriculum", progress: 70 }),
          createWorkspaceOkrKeyResult({ title: "Record 6 modules", progress: 33 }),
          createWorkspaceOkrKeyResult({ title: "Ship sales funnel", progress: 10 }),
        ],
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceDecisionMatrixBlock(
  partial: Partial<WorkspaceDecisionMatrixBlock> = {},
): WorkspaceDecisionMatrixBlock {
  const timestamp = getNowIsoString();
  const criteria = partial.criteria ?? getDecisionMatrixDefaultCriteria();

  return workspaceDecisionMatrixBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "decision-matrix",
    title: partial.title ?? "Decision matrix",
    question: partial.question ?? "What decision are you making?",
    criteria,
    options: partial.options ?? [
      createWorkspaceDecisionMatrixOption({
        label: "Option A",
        scores: createDecisionMatrixScoreMap(criteria, [8, 5, 7]),
      }),
      createWorkspaceDecisionMatrixOption({
        label: "Option B",
        scores: createDecisionMatrixScoreMap(criteria, [6, 8, 5]),
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceBusinessModelCanvasBlock(
  partial: Partial<WorkspaceBusinessModelCanvasBlock> = {},
): WorkspaceBusinessModelCanvasBlock {
  const timestamp = getNowIsoString();

  return workspaceBusinessModelCanvasBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "business-model-canvas",
    title: partial.title ?? "Business model canvas",
    cells: partial.cells ?? getBusinessModelCanvasDefaultCells(),
    analysis: partial.analysis ?? "",
    analysisUpdatedAt: partial.analysisUpdatedAt ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceAssumptionTrackerBlock(
  partial: Partial<WorkspaceAssumptionTrackerBlock> = {},
): WorkspaceAssumptionTrackerBlock {
  const timestamp = getNowIsoString();

  return workspaceAssumptionTrackerBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "assumption-tracker",
    title: partial.title ?? "Assumption tracker",
    filter: partial.filter ?? "all",
    assumptions: partial.assumptions ?? [
      createWorkspaceStrategicAssumption({
        statement: "Senior marketers will pay premium for practical training",
        status: "validating",
        confidence: 4,
        owner: "Growth lead",
        reviewDate: "2026-04-12",
        evidenceNotes: "Discovery calls show demand for practical case-based material.",
      }),
      createWorkspaceStrategicAssumption({
        statement: "Content-led demand can fill the next cohort",
        status: "at-risk",
        confidence: 3,
        owner: "Content lead",
        reviewDate: "2026-04-05",
        evidenceNotes: "Organic pipeline is inconsistent and CAC benchmarks are not proven yet.",
      }),
      createWorkspaceStrategicAssumption({
        statement: "Agency case studies will strengthen conversion rate",
        status: "confirmed",
        confidence: 5,
        owner: "Sales lead",
        reviewDate: "2026-04-20",
        evidenceNotes:
          "Recent calls referenced proof and closed faster after seeing outcome stories.",
      }),
    ],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlockTemplate(
  partial: Partial<WorkspaceCustomBlockTemplate> & {
    fields: WorkspaceCustomBlockField[];
    name: string;
  },
): WorkspaceCustomBlockTemplate {
  const timestamp = getNowIsoString();

  return workspaceCustomBlockTemplateSchema.parse({
    id: partial.id ?? createWorkspaceId("template"),
    name: partial.name,
    fields: partial.fields,
    includeNotes: partial.includeNotes ?? false,
    formula: partial.formula ?? null,
    aiPromptTemplate: partial.aiPromptTemplate ?? null,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceCustomBlock(
  template: WorkspaceCustomBlockTemplate,
  partial: Partial<WorkspaceCustomBlock> = {},
): WorkspaceCustomBlock {
  const timestamp = getNowIsoString();
  const values =
    partial.values ??
    Object.fromEntries(
      template.fields.map((field) => [
        field.key,
        field.type === "checkbox" ? false : field.type === "number" ? 0 : "",
      ]),
    );

  return workspaceCustomBlockSchema.parse({
    id: partial.id ?? createWorkspaceId("block"),
    type: "custom",
    title: partial.title ?? template.name,
    definitionId: partial.definitionId ?? template.id,
    values,
    notes: partial.notes ?? "",
    latestAiOutput: partial.latestAiOutput ?? "",
    outputHistory: partial.outputHistory ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeTab(partial: Partial<WorkspaceNodeTab> = {}): WorkspaceNodeTab {
  const timestamp = getNowIsoString();

  return workspaceNodeTabSchema.parse({
    id: partial.id ?? createWorkspaceId("tab"),
    title: partial.title ?? "New tab",
    blocks: partial.blocks ?? [],
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
  });
}

export function createWorkspaceNodeViewState(
  partial: Partial<WorkspaceNodeViewState> = {},
): WorkspaceNodeViewState {
  return workspaceNodeViewStateSchema.parse({
    activeTabId: partial.activeTabId ?? null,
    notePreviewState: partial.notePreviewState ?? {},
  });
}

export function createWorkspaceNodeDashboard(
  partial: Partial<WorkspaceNodeDashboard> = {},
): WorkspaceNodeDashboard {
  return workspaceNodeDashboardSchema.parse({
    tint: partial.tint ?? "neutral",
    featuredBlocks: partial.featuredBlocks ?? [],
  });
}

export function createWorkspaceNode(
  partial: Partial<WorkspaceNode> & {
    title: string;
  },
): WorkspaceNode {
  const timestamp = getNowIsoString();
  const content = partial.content ?? "";

  return normalizeWorkspaceNode({
    id: partial.id ?? createWorkspaceId("node"),
    title: partial.title,
    content,
    label: partial.label ?? partial.title,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? DEFAULT_WORKSPACE_NODE_WIDTH,
    height: partial.height ?? DEFAULT_WORKSPACE_NODE_HEIGHT,
    minWidth: partial.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: partial.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: partial.updatedAt ?? timestamp,
    tabs: partial.tabs ?? [createDefaultWorkspaceTab("Overview", content)],
    customBlockTemplates: partial.customBlockTemplates ?? [],
    viewState: partial.viewState ?? {
      activeTabId: partial.tabs?.[0]?.id ?? null,
      notePreviewState: {},
    },
    dashboard: partial.dashboard ?? {
      tint: "neutral",
      featuredBlocks: [],
    },
  });
}

export function createDefaultWorkspaceTab(title = "Overview", body = "") {
  return createWorkspaceNodeTab({
    title,
    blocks: [createWorkspaceNotesBlock({ title: "Notes", body })],
  });
}

function normalizeWorkspaceKanbanBlock(
  block: WorkspaceKanbanBlock | (Partial<WorkspaceKanbanBlock> & { type: "kanban" }),
) {
  const columns =
    block.columns && block.columns.length > 0
      ? block.columns.map((column) => workspaceKanbanColumnSchema.parse(column))
      : createWorkspaceKanbanBlock().columns;
  const fallbackColumnId = columns[0]!.id;
  const validColumnIds = new Set(columns.map((column) => column.id));

  return workspaceKanbanBlockSchema.parse({
    ...block,
    columns,
    cards: (block.cards ?? []).map((card) => ({
      ...card,
      columnId: validColumnIds.has(card.columnId) ? card.columnId : fallbackColumnId,
    })),
  });
}

function normalizeWorkspaceDecisionMatrixBlock(
  block:
    | WorkspaceDecisionMatrixBlock
    | (Partial<WorkspaceDecisionMatrixBlock> & { type: "decision-matrix" }),
) {
  const criteria =
    block.criteria && block.criteria.length > 0
      ? block.criteria.map((criterion) => workspaceDecisionMatrixCriterionSchema.parse(criterion))
      : getDecisionMatrixDefaultCriteria();
  const validCriterionIds = new Set(criteria.map((criterion) => criterion.id));
  const options =
    block.options && block.options.length > 0
      ? block.options.map((option) =>
          workspaceDecisionMatrixOptionSchema.parse({
            ...option,
            scores: Object.fromEntries(
              criteria.map((criterion) => [criterion.id, option.scores?.[criterion.id] ?? 5]),
            ),
          }),
        )
      : createWorkspaceDecisionMatrixBlock({ criteria }).options;

  return workspaceDecisionMatrixBlockSchema.parse({
    ...block,
    question: block.question ?? "",
    criteria,
    options: options.map((option) => ({
      ...option,
      scores: Object.fromEntries(
        Object.entries(option.scores).filter(([criterionId]) => validCriterionIds.has(criterionId)),
      ),
    })),
  });
}

function normalizeWorkspaceSkillsHeatMapBlock(
  block:
    | WorkspaceSkillsHeatMapBlock
    | (Partial<WorkspaceSkillsHeatMapBlock> & { type: "skills-heat-map" }),
) {
  return workspaceSkillsHeatMapBlockSchema.parse({
    ...block,
    members: (block.members ?? []).map((member) => ({
      ...member,
      scores: createWorkspaceSkillsScoreMap(member.scores),
    })),
  });
}

function normalizeWorkspaceDelegationMatrixBlock(
  block:
    | WorkspaceDelegationMatrixBlock
    | (Partial<WorkspaceDelegationMatrixBlock> & { type: "delegation-matrix" }),
) {
  return workspaceDelegationMatrixBlockSchema.parse({
    ...block,
    hourlyRate: block.hourlyRate ?? 500,
    items: block.items ?? [],
  });
}

function normalizeWorkspaceTalentGridBlock(
  block: WorkspaceTalentGridBlock | (Partial<WorkspaceTalentGridBlock> & { type: "talent-grid" }),
) {
  return workspaceTalentGridBlockSchema.parse({
    ...block,
    members: block.members ?? [],
  });
}

function normalizeWorkspaceSeatPlannerBlock(
  block:
    | WorkspaceSeatPlannerBlock
    | (Partial<WorkspaceSeatPlannerBlock> & { type: "seat-planner" }),
) {
  return workspaceSeatPlannerBlockSchema.parse({
    ...block,
    filter: block.filter ?? "all",
    seats: block.seats ?? [],
  });
}

export function normalizeWorkspaceNodeTab(tab: WorkspaceNodeTab): WorkspaceNodeTab {
  const parsed = workspaceNodeTabSchema.parse({
    ...tab,
    blocks: tab.blocks ?? [],
  });

  return {
    ...parsed,
    blocks: parsed.blocks.map((block) => normalizeWorkspaceBlock(block)),
  };
}

export function normalizeWorkspaceBlock(block: WorkspaceBlock): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        tasks: block.tasks ?? [],
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        body: block.body ?? "",
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        pros: block.pros ?? [],
        cons: block.cons ?? [],
        recommendation: block.recommendation ?? "",
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        entries: block.entries ?? [],
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        prompt: block.prompt ?? "",
        latestOutput: block.latestOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
      });
    case "kanban":
      return normalizeWorkspaceKanbanBlock(block);
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        milestones: block.milestones ?? [],
      });
    case "skills-heat-map":
      return normalizeWorkspaceSkillsHeatMapBlock(block);
    case "delegation-matrix":
      return normalizeWorkspaceDelegationMatrixBlock(block);
    case "talent-grid":
      return normalizeWorkspaceTalentGridBlock(block);
    case "seat-planner":
      return normalizeWorkspaceSeatPlannerBlock(block);
    case "deal-scoring-matrix":
      return workspaceDealScoringMatrixBlockSchema.parse({
        ...block,
        deals: block.deals ?? [],
      });
    case "pipeline-funnel":
      return workspacePipelineFunnelBlockSchema.parse({
        ...block,
        deals: block.deals ?? [],
      });
    case "forecast-confidence-board":
      return workspaceForecastConfidenceBoardBlockSchema.parse({
        ...block,
        targetRevenueEgp: block.targetRevenueEgp ?? 50_000,
        deals: block.deals ?? [],
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        metrics: block.metrics ?? [],
      });
    case "okr-tracker":
      return workspaceOkrTrackerBlockSchema.parse({
        ...block,
        objectives: block.objectives ?? [],
      });
    case "decision-matrix":
      return normalizeWorkspaceDecisionMatrixBlock(block);
    case "business-model-canvas":
      return workspaceBusinessModelCanvasBlockSchema.parse({
        ...block,
        cells: {
          ...getBusinessModelCanvasDefaultCells(),
          ...block.cells,
        },
        analysis: block.analysis ?? "",
        analysisUpdatedAt: block.analysisUpdatedAt ?? null,
      });
    case "assumption-tracker":
      return workspaceAssumptionTrackerBlockSchema.parse({
        ...block,
        filter: block.filter ?? "all",
        assumptions: block.assumptions ?? [],
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        values: block.values ?? {},
        notes: block.notes ?? "",
        latestAiOutput: block.latestAiOutput ?? "",
        outputHistory: block.outputHistory ?? [],
      });
  }
}

export function normalizeWorkspaceNode(node: WorkspaceNode): WorkspaceNode {
  const parsed = workspaceNodeSchema.parse({
    ...node,
    content: node.content ?? "",
    tabs: node.tabs ?? [],
    customBlockTemplates: node.customBlockTemplates ?? [],
    viewState: node.viewState ?? {},
    dashboard: node.dashboard ?? {},
  });

  const tabs =
    parsed.tabs.length > 0
      ? parsed.tabs.map((tab) => normalizeWorkspaceNodeTab(tab))
      : [createDefaultWorkspaceTab("Overview", parsed.content)];
  const validTabIds = new Set(tabs.map((tab) => tab.id));
  const noteBlockIds = new Set(
    tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.type === "notes" ? [block.id] : [])),
    ),
  );
  const activeTabId =
    parsed.viewState.activeTabId && validTabIds.has(parsed.viewState.activeTabId)
      ? parsed.viewState.activeTabId
      : (tabs[0]?.id ?? null);
  const notePreviewState = Object.fromEntries(
    Object.entries(parsed.viewState.notePreviewState ?? {}).filter(([blockId]) =>
      noteBlockIds.has(blockId),
    ),
  );
  const featuredBlocks = parsed.dashboard.featuredBlocks.filter(({ tabId, blockId }) =>
    tabs.some((tab) => tab.id === tabId && tab.blocks.some((block) => block.id === blockId)),
  );

  return {
    ...parsed,
    label: parsed.label ?? parsed.title,
    minWidth: parsed.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: parsed.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    tabs,
    customBlockTemplates: parsed.customBlockTemplates.map((template) =>
      workspaceCustomBlockTemplateSchema.parse({
        ...template,
        includeNotes: template.includeNotes ?? false,
        formula: template.formula ?? null,
        aiPromptTemplate: template.aiPromptTemplate ?? null,
      }),
    ),
    viewState: createWorkspaceNodeViewState({
      activeTabId,
      notePreviewState,
    }),
    dashboard: createWorkspaceNodeDashboard({
      tint: parsed.dashboard.tint,
      featuredBlocks,
    }),
  };
}

export function cloneWorkspaceNodes(nodes: WorkspaceNode[]) {
  let cloned: WorkspaceNode[];

  try {
    cloned =
      typeof structuredClone === "function"
        ? structuredClone(nodes)
        : JSON.parse(JSON.stringify(nodes));
  } catch {
    // Vue reactive proxies cannot be passed to structuredClone in the browser.
    cloned = JSON.parse(JSON.stringify(nodes));
  }

  return cloned.map((node: WorkspaceNode) => normalizeWorkspaceNode(node));
}

function clonePromptOutputsForInsertion(outputs: WorkspacePromptOutput[]) {
  return outputs.map((entry) =>
    workspacePromptOutputSchema.parse({
      ...entry,
      id: createWorkspaceId("output"),
    }),
  );
}

export function cloneWorkspaceTemplatesForInsertion(
  templates: WorkspaceCustomBlockTemplate[],
  timestamp = getNowIsoString(),
) {
  const templateIdMap = new Map<string, string>();
  const clonedTemplates = templates.map((template) => {
    const nextTemplateId = createWorkspaceId("template");
    templateIdMap.set(template.id, nextTemplateId);

    return workspaceCustomBlockTemplateSchema.parse({
      ...template,
      id: nextTemplateId,
      fields: template.fields.map((field) => ({
        ...field,
        id: createWorkspaceId("field"),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return {
    templateIdMap,
    templates: clonedTemplates,
  };
}

export function cloneWorkspaceBlockForInsertion(
  block: WorkspaceBlock,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceBlock {
  switch (block.type) {
    case "task-list":
      return workspaceTaskListBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        tasks: block.tasks.map((task) => ({
          ...task,
          id: createWorkspaceId("task"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "notes":
      return workspaceNotesBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "decision":
      return workspaceDecisionBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        pros: block.pros.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        cons: block.cons.map((item) => ({
          ...item,
          id: createWorkspaceId("decision"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "tracker":
      return workspaceTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        entries: block.entries.map((entry) => ({
          ...entry,
          id: createWorkspaceId("entry"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "ai-prompt":
      return workspaceAiPromptBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "time-orchestrator":
      return workspaceTimeOrchestratorBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        settings: createWorkspaceTimeOrchestratorSettings(block.settings),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "kanban": {
      const columnIdMap = new Map<string, string>();
      const columns = block.columns.map((column) => {
        const nextColumnId = createWorkspaceId("column");
        columnIdMap.set(column.id, nextColumnId);

        return workspaceKanbanColumnSchema.parse({
          ...column,
          id: nextColumnId,
        });
      });
      const fallbackColumnId = columns[0]?.id ?? createWorkspaceId("column");

      return workspaceKanbanBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        columns,
        cards: block.cards.map((card) => ({
          ...card,
          id: createWorkspaceId("card"),
          columnId: columnIdMap.get(card.columnId) ?? fallbackColumnId,
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "timeline":
      return workspaceTimelineBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        milestones: block.milestones.map((milestone) => ({
          ...milestone,
          id: createWorkspaceId("milestone"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "skills-heat-map":
      return workspaceSkillsHeatMapBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        members: block.members.map((member) => ({
          ...member,
          id: createWorkspaceId("person"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "delegation-matrix":
      return workspaceDelegationMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        items: block.items.map((item) => ({
          ...item,
          id: createWorkspaceId("delegation"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "talent-grid":
      return workspaceTalentGridBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        members: block.members.map((member) => ({
          ...member,
          id: createWorkspaceId("talent"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "seat-planner":
      return workspaceSeatPlannerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        seats: block.seats.map((seat) => ({
          ...seat,
          id: createWorkspaceId("seat"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "deal-scoring-matrix":
      return workspaceDealScoringMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("deal"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "pipeline-funnel":
      return workspacePipelineFunnelBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("funnel-deal"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "forecast-confidence-board":
      return workspaceForecastConfidenceBoardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        deals: block.deals.map((deal) => ({
          ...deal,
          id: createWorkspaceId("forecast"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "scorecard":
      return workspaceScorecardBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        metrics: block.metrics.map((metric) => ({
          ...metric,
          id: createWorkspaceId("metric"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "okr-tracker":
      return workspaceOkrTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        objectives: block.objectives.map((objective) => ({
          ...objective,
          id: createWorkspaceId("objective"),
          keyResults: objective.keyResults.map((keyResult) => ({
            ...keyResult,
            id: createWorkspaceId("key-result"),
          })),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "decision-matrix": {
      const criteria = block.criteria.map((criterion) => {
        const nextCriterionId = createWorkspaceId("criterion");

        return {
          ...criterion,
          id: nextCriterionId,
        };
      });

      return workspaceDecisionMatrixBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        criteria,
        options: block.options.map((option) => ({
          ...option,
          id: createWorkspaceId("option"),
          scores: Object.fromEntries(
            criteria.map((criterion, index) => [
              criterion.id,
              option.scores[block.criteria[index]!.id] ?? 5,
            ]),
          ),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    case "business-model-canvas":
      return workspaceBusinessModelCanvasBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "assumption-tracker":
      return workspaceAssumptionTrackerBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        assumptions: block.assumptions.map((assumption) => ({
          ...assumption,
          id: createWorkspaceId("assumption"),
        })),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    case "custom":
      return workspaceCustomBlockSchema.parse({
        ...block,
        id: createWorkspaceId("block"),
        definitionId: templateIdMap.get(block.definitionId) ?? block.definitionId,
        outputHistory: clonePromptOutputsForInsertion(block.outputHistory),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
  }
}

export function cloneWorkspaceTabForInsertion(
  tab: WorkspaceNodeTab,
  templateIdMap = new Map<string, string>(),
  timestamp = getNowIsoString(),
): WorkspaceNodeTab {
  return workspaceNodeTabSchema.parse({
    ...tab,
    id: createWorkspaceId("tab"),
    blocks: tab.blocks.map((block) =>
      cloneWorkspaceBlockForInsertion(block, templateIdMap, timestamp),
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function cloneWorkspaceNodeForInsertion(
  node: WorkspaceNode,
  timestamp = getNowIsoString(),
): WorkspaceNode {
  const { templateIdMap, templates } = cloneWorkspaceTemplatesForInsertion(
    node.customBlockTemplates,
    timestamp,
  );
  const tabIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const tabs = node.tabs.map((tab) => {
    const clonedTab = cloneWorkspaceTabForInsertion(tab, templateIdMap, timestamp);
    tabIdMap.set(tab.id, clonedTab.id);
    tab.blocks.forEach((block, index) => {
      const clonedBlockId = clonedTab.blocks[index]?.id;

      if (clonedBlockId) {
        blockIdMap.set(block.id, clonedBlockId);
      }
    });
    return clonedTab;
  });
  const activeTabId =
    node.viewState.activeTabId && tabIdMap.has(node.viewState.activeTabId)
      ? (tabIdMap.get(node.viewState.activeTabId) ?? tabs[0]?.id ?? null)
      : (tabs[0]?.id ?? null);
  const featuredBlocks = node.dashboard.featuredBlocks.flatMap((selection) => {
    const nextTabId = tabIdMap.get(selection.tabId);
    const nextBlockId = blockIdMap.get(selection.blockId);

    if (!nextTabId || !nextBlockId) {
      return [];
    }

    return [
      {
        tabId: nextTabId,
        blockId: nextBlockId,
      },
    ];
  });

  return normalizeWorkspaceNode({
    ...node,
    id: createWorkspaceId("node"),
    createdAt: timestamp,
    updatedAt: timestamp,
    label: node.title,
    tabs,
    customBlockTemplates: templates,
    viewState: {
      activeTabId,
      notePreviewState: {},
    },
    dashboard: {
      tint: node.dashboard.tint,
      featuredBlocks,
    },
  });
}
