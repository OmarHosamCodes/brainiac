import {
  getAuthorityScorecardSummary,
  getHookBankSummary,
  getMessageHouseSummary,
  sortHookBankItems,
  workspaceAuthorityScoreMetricLabels,
} from "./brand";
import { WORKSPACE_HABIT_GRID_DAYS } from "./constants";
import {
  getContentPipelineSummary,
  getContentQualityRadarSummary,
  getContentRoiScore,
  getContentRoiStatus,
  getContentRoiTrackerSummary,
  sortContentRoiItems,
  workspaceContentPipelineStatusLabels,
  workspaceContentPlatformLabels,
  workspaceContentQualityDimensionLabels,
  workspaceContentRoiStatusLabels,
} from "./content";
import {
  getCohortFillPercent,
  getCohortHealth,
  getCohortHealthScore,
  getCohortHealthSummary,
  getCourseRoadmapCourseProgress,
  getCourseRoadmapSummary,
  summarizeCourseRoadmapForPreview,
  workspaceCohortStatusLabels,
  workspaceCourseStatusLabels,
} from "./education";
import {
  getCollectionsTrackerSummary,
  getPricingSimulatorSummary,
  getProfitabilityCashFlowSummary,
  getProfitabilityClientMarginPercent,
  getReceivableDaysOverdue,
  getReceivableRiskLevel,
  sortReceivableInvoices,
  workspaceFinancePaymentStatusLabels,
  workspaceReceivableRiskLevelLabels,
  workspaceReceivableStatusLabels,
} from "./finance";
import {
  get2x2MatrixSummary,
  getChecklistProgress,
  getHabitGridSummary,
  getProcessSummary,
  getProsConsSummary,
  getSwotSummary,
  getTableSummary,
} from "./general";
import {
  getDelegationMatrixSummary,
  getSeatPlannerSummary,
  getSkillsHeatMapSummary,
  getTalentGridBoxKey,
  getTalentGridSummary,
  isSeatUncovered,
  workspaceDelegationStatusLabels,
  workspaceSeatHealthLabels,
  workspaceSeatLoadLevelLabels,
  workspaceTalentGridBoxLabels,
} from "./people";
import {
  getDealScoringMatrixSummary,
  getForecastConfidenceBoardSummary,
  getPipelineFunnelSummary,
  workspaceSalesForecastBucketLabels,
  workspaceSalesPipelineStageLabels,
  workspaceSalesTemperatureLabels,
} from "./sales";
import {
  getDisplayBlockTitle,
  getDisplayTabTitle,
  getDueDateValue,
  getTodayValue,
  trimToEmpty,
  truncateText,
} from "./shared";
import {
  getAssumptionTrackerSummary,
  getBusinessModelCanvasSummary,
  getDecisionMatrixSummary,
  getOkrTrackerSummary,
  resolveStrategicAssumptionLinkLabel,
  summarizeBusinessModelCanvasForPreview,
  workspaceBusinessModelCanvasCellLabels,
  workspaceStrategicAssumptionStatusLabels,
} from "./strategy";
import {
  collectWorkspaceNodeTasks,
  getEisenhowerMatrixSummary,
  getLeadershipRhythmPlannerSummary,
  getTimeOrchestratorSummary,
  getWorkspaceTaskDomainLabel,
  isLeadershipMeetingMissed,
  sortLeadershipRhythmMeetings,
  workspaceLeadershipMeetingStatusLabels,
} from "./tasks";
import type {
  WorkspaceBlock,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockTemplate,
  WorkspaceCustomBlockValue,
  WorkspaceDealScoringMatrixBlock,
  WorkspaceDecisionBlock,
  WorkspaceDecisionMatrixBlock,
  WorkspaceDecisionSummary,
  WorkspaceForecastConfidenceBoardBlock,
  WorkspaceNode,
  WorkspaceNodeDashboardDetail,
  WorkspaceNodeDashboardSelectableBlock,
  WorkspaceNodeTab,
  WorkspacePeopleSkillDimension,
  WorkspacePipelineFunnelBlock,
  WorkspaceScorecardMetric,
  WorkspaceSkillsHeatMapBlock,
  WorkspaceTask,
  WorkspaceTimelineMilestone,
  WorkspaceTrackerBlock,
  WorkspaceTrackerTrend,
} from "./types";

function formatDashboardTaskLine(task: WorkspaceTask) {
  const fragments: string[] = [];

  if (task.domain) {
    fragments.push(getWorkspaceTaskDomainLabel(task.domain));
  }

  if (task.priority) {
    fragments.push(`${task.priority} priority`);
  }

  if (task.dueDate) {
    fragments.push(`due ${task.dueDate}`);
  }

  return fragments.length > 0 ? `${task.text} (${fragments.join(", ")})` : task.text;
}

function formatEgpValue(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function getTimelineMilestoneSortValue(milestone: WorkspaceTimelineMilestone) {
  return milestone.date ? getDueDateValue(milestone.date) : Number.MAX_SAFE_INTEGER;
}

function isScorecardMetricOnTarget(metric: WorkspaceScorecardMetric) {
  return metric.target >= 0 ? metric.value >= metric.target : metric.value <= metric.target;
}

function getStrongestSkillDimension(averages: Record<WorkspacePeopleSkillDimension, number>) {
  const ranked = Object.entries(averages).sort((left, right) => right[1] - left[1]);
  return (ranked[0]?.[0] as WorkspacePeopleSkillDimension | undefined) ?? null;
}

function getSkillsHeatMapDimensionLabel(block: WorkspaceSkillsHeatMapBlock, dimensionId: string) {
  return block.dimensions.find((d) => d.id === dimensionId)?.label ?? "Skill";
}

function getTopSalesTemperature(
  block: WorkspaceDealScoringMatrixBlock | WorkspacePipelineFunnelBlock,
) {
  if (block.deals.length === 0) {
    return null;
  }

  const counts = {
    hot: block.deals.filter((deal) => deal.temperature === "hot").length,
    warm: block.deals.filter((deal) => deal.temperature === "warm").length,
    cold: block.deals.filter((deal) => deal.temperature === "cold").length,
  };
  const ranked = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  const temperature = ranked[0]?.[0];

  if (temperature === "hot" || temperature === "warm" || temperature === "cold") {
    return temperature;
  }

  return null;
}

function getTopForecastBucket(block: WorkspaceForecastConfidenceBoardBlock) {
  if (block.deals.length === 0) {
    return null;
  }

  const summary = getForecastConfidenceBoardSummary(block);
  const topBucket = summary.bucketSummaries
    .slice()
    .sort((left, right) => right.totalValue - left.totalValue)[0];

  return topBucket?.bucket ?? null;
}

function summaryBusinessModelCanvasHasContent(block: WorkspaceBlock) {
  return (
    block.type === "business-model-canvas" &&
    Object.values(block.cells).some((value) => trimToEmpty(value).length > 0)
  );
}

function buildWorkspaceNodeDashboardDetail(
  node: WorkspaceNode,
  tab: WorkspaceNodeTab,
  block: WorkspaceBlock,
  allNodes?: WorkspaceNode[],
): WorkspaceNodeDashboardDetail {
  if (block.type === "task-list") {
    const completedTasks = block.tasks.filter((task) => task.completed).length;
    const openTasks = block.tasks.filter((task) => !task.completed);
    const overdueTasks = openTasks.filter(
      (task) => task.dueDate && getDueDateValue(task.dueDate) < getTodayValue(),
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.tasks.length > 0
          ? `${openTasks.length} open tasks out of ${block.tasks.length}.`
          : "No tasks added yet.",
      metrics: [
        {
          label: "Done",
          value: `${completedTasks}/${block.tasks.length}`,
        },
        {
          label: "Open",
          value: String(openTasks.length),
        },
        ...(overdueTasks > 0
          ? [
            {
              label: "Overdue",
              value: String(overdueTasks),
            },
          ]
          : []),
      ],
      highlights: openTasks.slice(0, 2).map((task) => formatDashboardTaskLine(task)),
    };
  }

  if (block.type === "notes") {
    const lines = block.body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: lines[0] ? truncateText(lines[0], 110) : "No notes captured yet.",
      metrics: [
        {
          label: "Lines",
          value: String(lines.length),
        },
      ],
      highlights: lines.slice(1, 3).map((line) => truncateText(line, 110)),
    };
  }

  if (block.type === "table") {
    const summary = getTableSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.rowCount > 0
          ? `${summary.filledCellCount} filled cells across ${summary.rowCount} rows and ${summary.columnCount} columns.`
          : "No table rows added yet.",
      metrics: [
        {
          label: "Rows",
          value: String(summary.rowCount),
        },
        {
          label: "Cols",
          value: String(summary.columnCount),
        },
        {
          label: "Filled",
          value: String(summary.filledCellCount),
        },
      ],
      highlights: block.rows.slice(0, 2).map((row, index) => {
        const rowSummary = block.columns
          .map((column) => trimToEmpty(row.cells[column.id]))
          .filter(Boolean)
          .slice(0, 3)
          .join(" | ");

        return rowSummary || `Row ${index + 1}`;
      }),
    };
  }

  if (block.type === "checklist") {
    const progress = getChecklistProgress(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        progress.total > 0
          ? `${progress.completed}/${progress.total} items completed.`
          : "No checklist items added yet.",
      metrics: [
        {
          label: "Done",
          value: `${progress.completed}/${progress.total}`,
        },
        {
          label: "Left",
          value: String(progress.remaining),
        },
        {
          label: "Progress",
          value: `${progress.percent}%`,
        },
      ],
      highlights: block.items
        .filter((item) => !item.completed)
        .slice(0, 2)
        .map((item) => truncateText(item.text, 90)),
    };
  }

  if (block.type === "decision") {
    const summary = getDecisionSummary(block);
    const recommendation = trimToEmpty(block.recommendation);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        recommendation ||
        `Decision signal is ${summary.signal.replace("-", " ")} with score ${summary.totalScore}.`,
      metrics: [
        {
          label: "Score",
          value: String(summary.totalScore),
        },
        {
          label: "Pros",
          value: String(block.pros.length),
        },
        {
          label: "Cons",
          value: String(block.cons.length),
        },
      ],
      highlights: [
        ...block.pros.slice(0, 1).map((item) => `Upside: ${truncateText(item.text, 90)}`),
        ...block.cons.slice(0, 1).map((item) => `Risk: ${truncateText(item.text, 90)}`),
      ],
    };
  }

  if (block.type === "pros-cons") {
    const summary = getProsConsSummary(block);
    const verdictLabel =
      summary.verdict === "do-it" ? "DO IT" : summary.verdict === "dont" ? "DON'T" : "TIE";

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `${verdictLabel} with ${summary.prosWeight} pro points vs ${summary.consWeight} con points.`,
      metrics: [
        {
          label: "Pros",
          value: String(summary.prosWeight),
        },
        {
          label: "Cons",
          value: String(summary.consWeight),
        },
        {
          label: "Verdict",
          value: verdictLabel,
        },
      ],
      highlights: [
        ...block.pros.slice(0, 1).map((item) => `Pro: ${truncateText(item.text, 90)}`),
        ...block.cons.slice(0, 1).map((item) => `Con: ${truncateText(item.text, 90)}`),
      ],
    };
  }

  if (block.type === "swot") {
    const summary = getSwotSummary(block);
    const highlights = [
      trimToEmpty(block.cells.strengths)
        ? `Strengths: ${truncateText(block.cells.strengths, 90)}`
        : "",
      trimToEmpty(block.cells.weaknesses)
        ? `Weaknesses: ${truncateText(block.cells.weaknesses, 90)}`
        : "",
      trimToEmpty(block.cells.opportunities)
        ? `Opportunities: ${truncateText(block.cells.opportunities, 90)}`
        : "",
      trimToEmpty(block.cells.threats) ? `Threats: ${truncateText(block.cells.threats, 90)}` : "",
    ].filter(Boolean);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `${summary.filledCellCount}/4 SWOT quadrants filled.`,
      metrics: [
        {
          label: "Filled",
          value: `${summary.filledCellCount}/4`,
        },
        {
          label: "Empty",
          value: String(summary.emptyCellCount),
        },
      ],
      highlights: highlights.slice(0, 2),
    };
  }

  if (block.type === "tracker") {
    const trend = getTrackerTrend(block);
    const latestEntry = block.entries[block.entries.length - 1];
    const trendLabel =
      trend.direction === "flat" ? "Flat" : `${trend.direction === "up" ? "+" : ""}${trend.delta}`;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: latestEntry
        ? `${latestEntry.label || "Latest value"} is ${latestEntry.value}.`
        : "No tracker entries yet.",
      metrics: [
        {
          label: "Entries",
          value: String(block.entries.length),
        },
        ...(latestEntry
          ? [
            {
              label: "Trend",
              value: trendLabel,
            },
          ]
          : []),
      ],
      highlights: block.entries
        .slice(-2)
        .reverse()
        .map((entry) => `${entry.label || "Entry"}: ${entry.value}`),
    };
  }

  if (block.type === "habit-grid") {
    const summary = getHabitGridSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.totalHabits > 0
          ? `${summary.overallPercent}% overall consistency across ${summary.totalHabits} habits.`
          : "No habits added yet.",
      metrics: [
        {
          label: "Habits",
          value: String(summary.totalHabits),
        },
        {
          label: "Checks",
          value: `${summary.completedChecks}/${summary.possibleChecks}`,
        },
        {
          label: "Overall",
          value: `${summary.overallPercent}%`,
        },
      ],
      highlights: block.habits
        .slice()
        .sort(
          (left, right) =>
            WORKSPACE_HABIT_GRID_DAYS.filter((day) => right.days[day]).length -
            WORKSPACE_HABIT_GRID_DAYS.filter((day) => left.days[day]).length,
        )
        .slice(0, 2)
        .map((habit) => {
          const checked = WORKSPACE_HABIT_GRID_DAYS.filter((day) => habit.days[day]).length;
          const percent = Math.round((checked / WORKSPACE_HABIT_GRID_DAYS.length) * 100);
          return `${habit.name}: ${checked}/7 days (${percent}%)`;
        }),
    };
  }

  if (block.type === "process") {
    const summary = getProcessSummary(block);
    const nextOpenStep = block.steps.find((step) => !step.completed);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: nextOpenStep
        ? `Next step is ${nextOpenStep.title}.`
        : summary.totalSteps > 0
          ? "All process steps are complete."
          : "No process steps added yet.",
      metrics: [
        {
          label: "Steps",
          value: String(summary.totalSteps),
        },
        {
          label: "Done",
          value: String(summary.completedSteps),
        },
        {
          label: "Progress",
          value: `${summary.percent}%`,
        },
      ],
      highlights: block.steps.slice(0, 2).map((step, index) => `${index + 1}. ${step.title}`),
    };
  }

  if (block.type === "2x2-matrix") {
    const summary = get2x2MatrixSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.itemCount > 0
          ? `${summary.itemCount} items mapped across four quadrants.`
          : "No matrix items added yet.",
      metrics: [
        {
          label: "Items",
          value: String(summary.itemCount),
        },
        {
          label: "Axis X",
          value: block.xAxisLabel,
        },
        {
          label: "Axis Y",
          value: block.yAxisLabel,
        },
      ],
      highlights: [
        `${block.quadrants.topLeft.name}: ${block.quadrants.topLeft.items.length}`,
        `${block.quadrants.topRight.name}: ${block.quadrants.topRight.items.length}`,
      ],
    };
  }

  if (block.type === "ai-prompt") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: trimToEmpty(block.prompt)
        ? truncateText(block.prompt, 110)
        : "Prompt not configured yet.",
      metrics: [
        {
          label: "Runs",
          value: String(block.outputHistory.length),
        },
        {
          label: "Output",
          value: trimToEmpty(block.latestOutput) ? "Saved" : "Empty",
        },
      ],
      highlights: trimToEmpty(block.latestOutput) ? [truncateText(block.latestOutput, 110)] : [],
    };
  }

  if (block.type === "course-roadmap") {
    const summary = getCourseRoadmapSummary(block);
    const highlightedCourses = block.courses
      .slice()
      .sort(
        (left, right) =>
          getCourseRoadmapCourseProgress(right).completionPercent -
          getCourseRoadmapCourseProgress(left).completionPercent,
      )
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.courseCount > 0
          ? `${summary.recordedLessons}/${summary.lessonCount} lessons recorded across ${summary.courseCount} courses.`
          : "No courses mapped yet.",
      metrics: [
        {
          label: "Courses",
          value: String(summary.courseCount),
        },
        {
          label: "Recorded",
          value: `${summary.recordedLessons}/${summary.lessonCount}`,
        },
        {
          label: "Avg progress",
          value: `${summary.averageCompletionPercent}%`,
        },
      ],
      highlights: highlightedCourses.map((course) => {
        const progress = getCourseRoadmapCourseProgress(course);
        return `${course.name}: ${progress.recordedLessons}/${progress.lessonCount}, ${workspaceCourseStatusLabels[course.status]}`;
      }),
    };
  }

  if (block.type === "learning-outcomes-matrix") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: trimToEmpty(block.prompt)
        ? truncateText(block.prompt, 110)
        : "Outcomes analysis prompt not configured yet.",
      metrics: [
        {
          label: "Runs",
          value: String(block.outputHistory.length),
        },
        {
          label: "Output",
          value: trimToEmpty(block.latestOutput) ? "Saved" : "Empty",
        },
      ],
      highlights: trimToEmpty(block.latestOutput) ? [truncateText(block.latestOutput, 110)] : [],
    };
  }

  if (block.type === "time-orchestrator") {
    const orchestration = getTimeOrchestratorSummary(node, block.settings, new Date(), allNodes);
    const estimateHours = Number((orchestration.totalEstimateMinutes / 60).toFixed(1));

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        orchestration.totalOpenTasks > 0
          ? `${orchestration.suggestedNextActions.length} suggested next actions across ${orchestration.totalOpenTasks} open tasks.`
          : "No open tasks match the current orchestration filters.",
      metrics: [
        {
          label: "Open",
          value: String(orchestration.totalOpenTasks),
        },
        {
          label: "Estimate",
          value: `${estimateHours}h`,
        },
        {
          label: "Overdue",
          value: String(orchestration.overdue.length),
        },
      ],
      highlights: orchestration.suggestedNextActions
        .slice(0, 2)
        .map(({ task }) => formatDashboardTaskLine(task)),
    };
  }

  if (block.type === "cohort-health-dashboard") {
    const summary = getCohortHealthSummary(block);
    const prioritizedCohorts = block.cohorts
      .slice()
      .sort((left, right) => getCohortHealthScore(left) - getCohortHealthScore(right))
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.cohortCount > 0
          ? `${summary.atRiskCount} at-risk cohorts with ${summary.fillPercent}% capacity filled overall.`
          : "No cohorts tracked yet.",
      metrics: [
        {
          label: "Seats sold",
          value: `${summary.totalSeatsSold}/${summary.totalCapacity}`,
        },
        {
          label: "Fill",
          value: `${summary.fillPercent}%`,
        },
        {
          label: "Revenue",
          value: formatEgpValue(summary.bookedRevenueEgp),
        },
      ],
      highlights: prioritizedCohorts.map(
        (cohort) =>
          `${cohort.name}: ${getCohortFillPercent(cohort)}% full, ${workspaceCohortStatusLabels[cohort.status]}, ${getCohortHealth(cohort)}`,
      ),
    };
  }

  if (block.type === "eisenhower-matrix") {
    const summary = getEisenhowerMatrixSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.totalTaskCount > 0
          ? `${summary.prioritizedTasks.filter((task) => !task.completed).length} open tasks sorted across four priority quadrants.`
          : "No tasks added yet.",
      metrics: [
        {
          label: "Load",
          value: `${Number((summary.totalEstimateMinutes / 60).toFixed(1))}h`,
        },
        {
          label: "Overdue",
          value: String(summary.overdueCount),
        },
        {
          label: "Done",
          value: String(summary.completedCount),
        },
      ],
      highlights: summary.prioritizedTasks
        .filter((task) => !task.completed)
        .slice(0, 2)
        .map((task) => formatDashboardTaskLine(task)),
    };
  }

  if (block.type === "leadership-rhythm-planner") {
    const summary = getLeadershipRhythmPlannerSummary(block);
    const highlightedMeetings = sortLeadershipRhythmMeetings(block.meetings)
      .filter((meeting) => isLeadershipMeetingMissed(meeting) || meeting.status === "scheduled")
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.totalMeetings > 0
          ? `${summary.cadenceHealthPercent}% cadence health with ${summary.upcomingCount} meetings upcoming.`
          : "No recurring meetings planned yet.",
      metrics: [
        {
          label: "Upcoming",
          value: String(summary.upcomingCount),
        },
        {
          label: "Missed",
          value: String(summary.missedCount),
        },
        {
          label: "Health",
          value: `${summary.cadenceHealthPercent}%`,
        },
      ],
      highlights: highlightedMeetings.map(
        (meeting) =>
          `${meeting.name}: ${workspaceLeadershipMeetingStatusLabels[meeting.status]}${meeting.nextDate ? ` (${meeting.nextDate})` : ""}`,
      ),
    };
  }

  if (block.type === "kanban") {
    const cardsByColumn = block.columns.map((column) => ({
      title: column.title.trim() || "Untitled column",
      count: block.cards.filter((card) => card.columnId === column.id).length,
    }));

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.cards.length > 0
          ? `${block.cards.length} cards across ${block.columns.length} columns.`
          : "No cards on the board yet.",
      metrics: [
        {
          label: "Cards",
          value: String(block.cards.length),
        },
        {
          label: "Columns",
          value: String(block.columns.length),
        },
      ],
      highlights: cardsByColumn
        .filter((entry) => entry.count > 0)
        .slice(0, 3)
        .map((entry) => `${entry.title}: ${entry.count}`),
    };
  }

  if (block.type === "timeline") {
    const sortedMilestones = [...block.milestones].sort(
      (left, right) => getTimelineMilestoneSortValue(left) - getTimelineMilestoneSortValue(right),
    );
    const nextMilestone = sortedMilestones.find((milestone) => milestone.status !== "done");
    const doneCount = block.milestones.filter((milestone) => milestone.status === "done").length;
    const activeCount = block.milestones.filter(
      (milestone) => milestone.status === "active",
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: nextMilestone
        ? `Next milestone is ${nextMilestone.title}${nextMilestone.date ? ` on ${nextMilestone.date}` : ""}.`
        : block.milestones.length > 0
          ? "All milestones are marked done."
          : "No milestones planned yet.",
      metrics: [
        {
          label: "Milestones",
          value: String(block.milestones.length),
        },
        {
          label: "Done",
          value: String(doneCount),
        },
        {
          label: "Active",
          value: String(activeCount),
        },
      ],
      highlights: sortedMilestones
        .slice(0, 2)
        .map((milestone) => `${milestone.title}${milestone.date ? ` (${milestone.date})` : ""}`),
    };
  }

  if (block.type === "skills-heat-map") {
    const summary = getSkillsHeatMapSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.memberCount > 0
          ? `${summary.criticalGapCount} critical skill gaps across ${summary.memberCount} team members.`
          : "No team members mapped yet.",
      metrics: [
        {
          label: "Team",
          value: String(summary.memberCount),
        },
        {
          label: "Avg score",
          value: `${summary.overallAverage}/10`,
        },
        {
          label: "Critical",
          value: String(summary.criticalGapCount),
        },
      ],
      highlights:
        summary.memberCount > 0
          ? [
            ...(summary.strongestDimension
              ? [
                `Strongest: ${getSkillsHeatMapDimensionLabel(block, summary.strongestDimension)} ${summary.averageByDimension[summary.strongestDimension]}/10`,
              ]
              : []),
            ...(summary.weakestDimension
              ? [
                `Weakest: ${getSkillsHeatMapDimensionLabel(block, summary.weakestDimension)} ${summary.averageByDimension[summary.weakestDimension]}/10`,
              ]
              : []),
          ]
          : [],
    };
  }

  if (block.type === "delegation-matrix") {
    const summary = getDelegationMatrixSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.itemCount > 0
          ? `${summary.pendingHoursPerWeek} founder hours are still waiting to be delegated.`
          : "No delegation targets added yet.",
      metrics: [
        {
          label: "Items",
          value: String(summary.itemCount),
        },
        {
          label: "Hours",
          value: `${summary.totalHoursPerWeek}/wk`,
        },
        {
          label: "Stuck",
          value: String(summary.stuckCount),
        },
      ],
      highlights: block.items
        .slice()
        .sort((left, right) => right.hoursPerWeek - left.hoursPerWeek)
        .slice(0, 2)
        .map(
          (item) =>
            `${item.task} -> ${trimToEmpty(item.to) || "Unassigned"} (${item.hoursPerWeek}h, ${workspaceDelegationStatusLabels[item.status]})`,
        ),
    };
  }

  if (block.type === "talent-grid") {
    const summary = getTalentGridSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.memberCount > 0
          ? `${summary.superstarCount} superstars and ${summary.riskCount} risk profiles across the current team.`
          : "No talent profiles added yet.",
      metrics: [
        {
          label: "Team",
          value: String(summary.memberCount),
        },
        {
          label: "Stars",
          value: String(summary.superstarCount + summary.growthStarCount),
        },
        {
          label: "Risk",
          value: String(summary.riskCount),
        },
      ],
      highlights: block.members
        .slice(0, 3)
        .map(
          (member) =>
            `${member.name}: ${workspaceTalentGridBoxLabels[getTalentGridBoxKey(member.performance, member.potential)]}`,
        ),
    };
  }

  if (block.type === "seat-planner") {
    const summary = getSeatPlannerSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.seatCount > 0
          ? `${summary.uncoveredSeats} seats are uncovered and ${summary.overloadedSeats} are overloaded.`
          : "No critical seats mapped yet.",
      metrics: [
        {
          label: "Seats",
          value: String(summary.seatCount),
        },
        {
          label: "Fragile",
          value: String(summary.fragileSeats),
        },
        {
          label: "Uncovered",
          value: String(summary.uncoveredSeats),
        },
      ],
      highlights: block.seats
        .filter(
          (seat) =>
            seat.health === "fragile" || seat.load === "overloaded" || isSeatUncovered(seat),
        )
        .slice(0, 3)
        .map((seat) => {
          const signals = [
            workspaceSeatHealthLabels[seat.health],
            workspaceSeatLoadLevelLabels[seat.load],
          ];

          if (isSeatUncovered(seat)) {
            signals.push("Uncovered");
          }

          return `${seat.name}: ${signals.join(", ")}`;
        }),
    };
  }

  if (block.type === "deal-scoring-matrix") {
    const summary = getDealScoringMatrixSummary(block);
    const topDeals = block.deals
      .slice()
      .sort((left, right) => right.score - left.score)
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.dealCount > 0
          ? `${summary.averageScore}% average score across ${summary.dealCount} deals.`
          : "No deals scored yet.",
      metrics: [
        {
          label: "Deals",
          value: String(summary.dealCount),
        },
        {
          label: "Hot",
          value: String(summary.hotCount),
        },
        {
          label: "Pipeline",
          value: formatEgpValue(summary.totalValue),
        },
      ],
      highlights: topDeals.map(
        (deal) =>
          `${deal.clientName}: ${deal.score}/100, ${workspaceSalesPipelineStageLabels[deal.stage]}`,
      ),
    };
  }

  if (block.type === "pipeline-funnel") {
    const summary = getPipelineFunnelSummary(block);
    const busiestStages = summary.stageSummaries
      .filter((stage) => stage.dealCount > 0)
      .sort((left, right) => right.totalValue - left.totalValue)
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.dealCount > 0
          ? `${formatEgpValue(summary.totalValue)} across ${summary.dealCount} pipeline deals.`
          : "No funnel deals yet.",
      metrics: [
        {
          label: "Open",
          value: formatEgpValue(summary.openValue),
        },
        {
          label: "Closed",
          value: formatEgpValue(summary.closedValue),
        },
        {
          label: "Deals",
          value: String(summary.dealCount),
        },
      ],
      highlights: busiestStages.map(
        (stage) => `${stage.label}: ${stage.dealCount} deals, ${formatEgpValue(stage.totalValue)}`,
      ),
    };
  }

  if (block.type === "forecast-confidence-board") {
    const summary = getForecastConfidenceBoardSummary(block);
    const weakestDeals = block.deals
      .slice()
      .sort((left, right) => left.confidence - right.confidence)
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.dealCount > 0
          ? `${formatEgpValue(summary.weightedForecast)} weighted forecast at ${summary.coveragePercent}% coverage.`
          : "No forecast deals yet.",
      metrics: [
        {
          label: "Commit",
          value: formatEgpValue(summary.commitRevenue),
        },
        {
          label: "At risk",
          value: formatEgpValue(summary.atRiskValue),
        },
        {
          label: "Coverage",
          value: `${summary.coveragePercent}%`,
        },
      ],
      highlights: weakestDeals.map(
        (deal) =>
          `${deal.clientName}: ${deal.confidence}% ${workspaceSalesForecastBucketLabels[deal.bucket]}`,
      ),
    };
  }

  if (block.type === "content-pipeline") {
    const summary = getContentPipelineSummary(block);
    const highlightedItems = block.items
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title))
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.totalItems > 0
          ? `${summary.reviewCount} pieces are waiting in review and ${summary.publishedCount} are already published.`
          : "No content pieces tracked yet.",
      metrics: [
        {
          label: "Pieces",
          value: String(summary.totalItems),
        },
        {
          label: "Published",
          value: String(summary.publishedCount),
        },
        {
          label: "Bottleneck",
          value: summary.bottleneckStatus
            ? workspaceContentPipelineStatusLabels[summary.bottleneckStatus]
            : "None",
        },
      ],
      highlights: highlightedItems.map(
        (item) =>
          `${truncateText(item.title, 72)} (${workspaceContentPlatformLabels[item.platform]}, ${workspaceContentPipelineStatusLabels[item.status]})`,
      ),
    };
  }

  if (block.type === "content-quality-radar") {
    const summary = getContentQualityRadarSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `Average quality score is ${summary.averageScore}/10.`,
      metrics: [
        {
          label: "Average",
          value: `${summary.averageScore}/10`,
        },
        {
          label: "Strongest",
          value: summary.strongestDimension
            ? workspaceContentQualityDimensionLabels[summary.strongestDimension]
            : "None",
        },
        {
          label: "Weakest",
          value: summary.weakestDimension
            ? workspaceContentQualityDimensionLabels[summary.weakestDimension]
            : "None",
        },
      ],
      highlights: Object.entries(block.scores)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .slice(0, 2)
        .map(
          ([dimension, score]) =>
            `${workspaceContentQualityDimensionLabels[dimension as keyof typeof block.scores]}: ${score}/10`,
        ),
    };
  }

  if (block.type === "content-roi-tracker") {
    const summary = getContentRoiTrackerSummary(block);
    const topItems = sortContentRoiItems(block.items, "roi").slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.itemCount > 0
          ? `${summary.totalInfluencedLeads} influenced leads tracked across ${summary.itemCount} content pieces.`
          : "No content ROI data tracked yet.",
      metrics: [
        {
          label: "Avg ROI",
          value: `${summary.averageScore}`,
        },
        {
          label: "Top Platform",
          value: summary.topPlatform ? workspaceContentPlatformLabels[summary.topPlatform] : "None",
        },
        {
          label: "Influenced",
          value: String(summary.totalInfluencedLeads),
        },
      ],
      highlights: topItems.map((item) => {
        const score = getContentRoiScore(item);
        return `${truncateText(item.title, 72)} (${workspaceContentRoiStatusLabels[getContentRoiStatus(score)]}, ${score})`;
      }),
    };
  }

  if (block.type === "authority-scorecard") {
    const summary = getAuthorityScorecardSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `${summary.atTargetCount} of ${summary.metricCount} authority metrics are on target.`,
      metrics: [
        {
          label: "Avg progress",
          value: `${summary.averageProgress}%`,
        },
        {
          label: "On target",
          value: String(summary.atTargetCount),
        },
      ],
      highlights: [
        ...(summary.strongestMetric
          ? [
            `Strongest: ${workspaceAuthorityScoreMetricLabels[summary.strongestMetric]} ${summary.metrics[summary.strongestMetric].value}/${summary.metrics[summary.strongestMetric].target}`,
          ]
          : []),
        ...(summary.weakestMetric
          ? [
            `Weakest: ${workspaceAuthorityScoreMetricLabels[summary.weakestMetric]} ${summary.metrics[summary.weakestMetric].value}/${summary.metrics[summary.weakestMetric].target}`,
          ]
          : []),
      ],
    };
  }

  if (block.type === "hook-bank") {
    const summary = getHookBankSummary(block);
    const topHooks = sortHookBankItems(block.hooks).slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.hookCount > 0
          ? `${summary.hookCount} hooks tracked with a ${summary.averageScore}/10 average score.`
          : "No hooks stored yet.",
      metrics: [
        {
          label: "Hooks",
          value: String(summary.hookCount),
        },
        {
          label: "Avg score",
          value: `${summary.averageScore}/10`,
        },
        {
          label: "Top category",
          value: summary.topCategory || "None",
        },
      ],
      highlights: topHooks.map(
        (hook) =>
          `[${trimToEmpty(hook.category) || "uncategorized"}] ${truncateText(hook.text, 72)} (${hook.score}/10)`,
      ),
    };
  }

  if (block.type === "message-house") {
    const summary = getMessageHouseSummary(block);
    const leadPillar = block.pillars.find((pillar) => trimToEmpty(pillar.body));

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `${summary.filledSectionCount} of 7 message-house sections are filled.`,
      metrics: [
        {
          label: "Filled",
          value: `${summary.filledSectionCount}/7`,
        },
        {
          label: "Pillars",
          value: String(summary.pillarCount),
        },
        {
          label: "Stress test",
          value: summary.latestStressTestAvailable ? "Saved" : "Not run",
        },
      ],
      highlights: [
        ...(trimToEmpty(block.brandPromise)
          ? [`Promise: ${truncateText(block.brandPromise, 90)}`]
          : []),
        ...(leadPillar
          ? [`${trimToEmpty(leadPillar.title) || "Pillar"}: ${truncateText(leadPillar.body, 90)}`]
          : []),
      ],
    };
  }

  if (block.type === "scorecard") {
    const onTargetCount = block.metrics.filter((metric) =>
      isScorecardMetricOnTarget(metric),
    ).length;

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        block.metrics.length > 0
          ? `${onTargetCount} of ${block.metrics.length} metrics are on target.`
          : "No scorecard metrics tracked yet.",
      metrics: [
        {
          label: "Metrics",
          value: String(block.metrics.length),
        },
        {
          label: "On target",
          value: String(onTargetCount),
        },
      ],
      highlights: block.metrics
        .slice(0, 2)
        .map(
          (metric) =>
            `${metric.label}: ${metric.value}/${metric.target}${metric.unit ? ` ${metric.unit}` : ""}`,
        ),
    };
  }

  if (block.type === "okr-tracker") {
    const summary = getOkrTrackerSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.objectiveCount > 0
          ? `${summary.averageProgress}% average progress across ${summary.objectiveCount} objectives.`
          : "No objectives added yet.",
      metrics: [
        {
          label: "Objectives",
          value: String(summary.objectiveCount),
        },
        {
          label: "Avg progress",
          value: `${summary.averageProgress}%`,
        },
        {
          label: "Off track",
          value: String(summary.offTrackCount),
        },
      ],
      highlights: summary.objectives
        .slice()
        .sort((left, right) => left.progress - right.progress)
        .slice(0, 2)
        .map((objective) => `${objective.title}: ${objective.progress}%`),
    };
  }

  if (block.type === "decision-matrix") {
    const summary = getDecisionMatrixSummary(block);
    const winner = summary.optionScores.find((option) => option.isWinner);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        trimToEmpty(block.question) ||
        (winner
          ? `${winner.label} is currently leading with ${winner.totalScore} points.`
          : "Decision matrix is ready for scoring."),
      metrics: [
        {
          label: "Criteria",
          value: String(summary.criteriaCount),
        },
        {
          label: "Options",
          value: String(summary.optionCount),
        },
        {
          label: "Leader",
          value: winner ? winner.label : "Tie",
        },
      ],
      highlights: summary.optionScores
        .slice(0, 3)
        .map((option) => `${option.label}: ${option.totalScore}`),
    };
  }

  if (block.type === "business-model-canvas") {
    const summary = getBusinessModelCanvasSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.filledCellCount > 0
          ? `${summary.filledCellCount} of 9 canvas cells are filled.`
          : "Canvas is empty.",
      metrics: [
        {
          label: "Filled",
          value: `${summary.filledCellCount}/9`,
        },
        {
          label: "Missing",
          value: String(summary.missingCellCount),
        },
        {
          label: "Readiness",
          value: summary.readiness,
        },
      ],
      highlights:
        summary.strongestCells.length > 0
          ? summary.strongestCells.map(
            (cellKey) => `Strong: ${workspaceBusinessModelCanvasCellLabels[cellKey]}`,
          )
          : summary.missingCells
            .slice(0, 2)
            .map((cellKey) => `Missing: ${workspaceBusinessModelCanvasCellLabels[cellKey]}`),
    };
  }

  if (block.type === "assumption-tracker") {
    const summary = getAssumptionTrackerSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.total > 0
          ? `${summary.atRiskCount} assumptions are currently at risk.`
          : "No assumptions tracked yet.",
      metrics: [
        {
          label: "Total",
          value: String(summary.total),
        },
        {
          label: "At risk",
          value: String(summary.atRiskCount),
        },
        {
          label: "Confidence",
          value: `${summary.averageConfidence}/5`,
        },
      ],
      highlights: block.assumptions
        .slice()
        .sort((left, right) => left.confidence - right.confidence)
        .slice(0, 2)
        .map((assumption) => {
          const linkedLabel = resolveStrategicAssumptionLinkLabel(node, assumption);
          const fragments = [workspaceStrategicAssumptionStatusLabels[assumption.status]];

          if (linkedLabel) {
            fragments.push(linkedLabel);
          }

          return `${truncateText(assumption.statement, 72)} (${fragments.join(", ")})`;
        }),
    };
  }

  if (block.type === "profitability-cash-flow") {
    const summary = getProfitabilityCashFlowSummary(block);
    const riskiestClients = block.clients
      .slice()
      .sort((left, right) => left.healthPercent - right.healthPercent)
      .slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.clientCount > 0
          ? `${formatEgpValue(summary.totalProfit)} profit at ${summary.marginPercent}% margin.`
          : "No client economics tracked yet.",
      metrics: [
        {
          label: "Revenue",
          value: formatEgpValue(summary.totalRevenue),
        },
        {
          label: "Expenses",
          value: formatEgpValue(summary.totalExpenses),
        },
        {
          label: "Margin",
          value: `${summary.marginPercent}%`,
        },
      ],
      highlights: [
        ...riskiestClients.map(
          (client) =>
            `${client.name}: ${workspaceFinancePaymentStatusLabels[client.paymentStatus]}, ${getProfitabilityClientMarginPercent(client)}% margin`,
        ),
        ...(summary.topExpenseCategory ? [`Top expense: ${summary.topExpenseCategory}`] : []),
      ].slice(0, 3),
    };
  }

  if (block.type === "pricing-simulator") {
    const summary = getPricingSimulatorSummary(block);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: `${formatEgpValue(summary.projectedRevenue)} projected revenue and ${formatEgpValue(summary.projectedProfit)} projected profit.`,
      metrics: [
        {
          label: "Clients",
          value: String(summary.activeClients),
        },
        {
          label: "Retainer / client",
          value: formatEgpValue(summary.minimumRetainerPerClient),
        },
        {
          label: "Required revenue",
          value: formatEgpValue(summary.requiredRevenue),
        },
      ],
      highlights: [
        `${summary.monthlyClientHours} total delivery hours at ${block.hourlyRateEgp} EGP/hour`,
        `Target margin: ${block.targetMarginPercent}%`,
      ],
    };
  }

  if (block.type === "collections-tracker") {
    const summary = getCollectionsTrackerSummary(block);
    const riskyInvoices = sortReceivableInvoices(block.invoices).slice(0, 2);

    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary:
        summary.invoiceCount > 0
          ? `${formatEgpValue(summary.totalOutstanding)} outstanding across ${summary.invoiceCount} invoices.`
          : "No receivables tracked yet.",
      metrics: [
        {
          label: "Outstanding",
          value: formatEgpValue(summary.totalOutstanding),
        },
        {
          label: "Overdue",
          value: formatEgpValue(summary.overdueAmount),
        },
        {
          label: "Collected",
          value: formatEgpValue(summary.collectedThisMonth),
        },
      ],
      highlights: riskyInvoices.map((invoice) => {
        const risk = getReceivableRiskLevel(invoice);
        const overdue = getReceivableDaysOverdue(invoice);
        return `${invoice.clientName}: ${workspaceReceivableStatusLabels[invoice.status]}, ${workspaceReceivableRiskLevelLabels[risk]}${overdue > 0 ? `, ${overdue}d overdue` : ""}`;
      }),
    };
  }

  if (block.type === "agency-project-manager") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: block.teamId
        ? "Agency project manager linked to a team workspace."
        : "Agency project manager waiting for team binding.",
      metrics: [
        {
          label: "Team",
          value: block.teamId ? "Linked" : "Unlinked",
        },
        {
          label: "Archived clients",
          value: block.showArchivedClients ? "Shown" : "Hidden",
        },
        {
          label: "Archived projects",
          value: block.showArchivedProjects ? "Shown" : "Hidden",
        },
      ],
      highlights: [
        block.selectedClientId ? "Client filter is active." : "Showing all clients.",
      ],
    };
  }

  if (block.type === "agency-time-tracker") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: block.teamId
        ? "Tracks live timer sessions against sprint tasks and steps."
        : "Agency time tracker waiting for team binding.",
      metrics: [
        {
          label: "Team",
          value: block.teamId ? "Linked" : "Unlinked",
        },
        {
          label: "Recent log",
          value: block.showRecentEntries ? "Shown" : "Hidden",
        },
      ],
      highlights: ["Timer starts only from agency sprint items."],
    };
  }

  if (block.type === "agency-time-entries-log") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: block.teamId
        ? "Shows each member's own entries with weekly rollups."
        : "Agency entries log waiting for team binding.",
      metrics: [
        {
          label: "Team",
          value: block.teamId ? "Linked" : "Unlinked",
        },
        {
          label: "Page size",
          value: String(block.pageSize),
        },
      ],
      highlights: ["Manual and timer entries are unified in one log."],
    };
  }

  if (block.type === "agency-sprint-board") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: block.teamId
        ? "Sprint board for agency tasks and steps."
        : "Agency sprint board waiting for team binding.",
      metrics: [
        {
          label: "Team",
          value: block.teamId ? "Linked" : "Unlinked",
        },
        {
          label: "Completed",
          value: block.showCompletedItems ? "Shown" : "Hidden",
        },
      ],
      highlights: [
        block.activeSprintId ? "An active sprint is selected." : "No sprint selected yet.",
      ],
    };
  }

  if (block.type === "agency-time-reports") {
    return {
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
      summary: block.teamId
        ? "Team-level utilization, burn, and distribution reporting."
        : "Agency reports waiting for team binding.",
      metrics: [
        {
          label: "Team",
          value: block.teamId ? "Linked" : "Unlinked",
        },
        {
          label: "Preset",
          value: block.datePreset,
        },
      ],
      highlights: ["CSV export available for the filtered range."],
    };
  }

  const template = node.customBlockTemplates.find((entry) => entry.id === block.definitionId);
  const formulaResult = evaluateCustomBlockFormula(template?.formula?.expression, block.values);
  const filledValues = Object.entries(block.values)
    .filter(([, value]) => value !== null && String(value).trim().length > 0)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return {
    tabId: tab.id,
    tabTitle: getDisplayTabTitle(tab),
    blockId: block.id,
    blockTitle: getDisplayBlockTitle(block),
    blockType: block.type,
    summary:
      formulaResult !== null
        ? `${template?.formula?.label || "Formula"} is ${formulaResult}.`
        : template?.name
          ? `${template.name} block with ${Object.keys(block.values).length} fields.`
          : "Custom block data captured.",
    metrics: [
      {
        label: "Fields",
        value: String(Object.keys(block.values).length),
      },
      {
        label: "Outputs",
        value: String(block.outputHistory.length),
      },
    ],
    highlights:
      filledValues.length > 0
        ? filledValues
        : trimToEmpty(block.notes)
          ? [truncateText(block.notes, 110)]
          : [],
  };
}

export function getWorkspaceNodePreview(node: WorkspaceNode, maxLength = 180) {
  const summary = trimToEmpty(node.content);

  if (summary) {
    return truncateText(summary, maxLength);
  }

  for (const tab of node.tabs) {
    for (const block of tab.blocks) {
      if (block.type === "notes" && trimToEmpty(block.body)) {
        return truncateText(block.body, maxLength);
      }

      if (block.type === "task-list" && block.tasks.length > 0) {
        const remaining = block.tasks.filter((task) => !task.completed).length;

        return truncateText(
          `${block.title}: ${remaining} remaining of ${block.tasks.length} tasks.`,
          maxLength,
        );
      }

      if (block.type === "table" && block.rows.length > 0) {
        const summary = getTableSummary(block);

        return truncateText(
          `${block.title}: ${summary.rowCount} rows, ${summary.columnCount} columns, ${summary.filledCellCount} filled cells.`,
          maxLength,
        );
      }

      if (block.type === "checklist" && block.items.length > 0) {
        const progress = getChecklistProgress(block);

        return truncateText(
          `${block.title}: ${progress.completed}/${progress.total} completed (${progress.percent}%).`,
          maxLength,
        );
      }

      if (block.type === "decision" && trimToEmpty(block.recommendation)) {
        return truncateText(block.recommendation, maxLength);
      }

      if (block.type === "pros-cons" && (block.pros.length > 0 || block.cons.length > 0)) {
        const summary = getProsConsSummary(block);
        const verdict =
          summary.verdict === "do-it" ? "DO IT" : summary.verdict === "dont" ? "DON'T" : "TIE";

        return truncateText(
          `${block.title}: ${verdict} with ${summary.prosWeight} pros vs ${summary.consWeight} cons.`,
          maxLength,
        );
      }

      if (block.type === "swot") {
        const summary = getSwotSummary(block);

        if (summary.filledCellCount > 0) {
          return truncateText(
            `${block.title}: ${summary.filledCellCount}/4 SWOT quadrants filled.`,
            maxLength,
          );
        }
      }

      if (block.type === "course-roadmap" && block.courses.length > 0) {
        return truncateText(summarizeCourseRoadmapForPreview(block), maxLength);
      }

      if (block.type === "learning-outcomes-matrix" && trimToEmpty(block.prompt)) {
        return truncateText(
          `${block.title}: ${trimToEmpty(block.latestOutput) ? "analysis saved" : trimToEmpty(block.prompt)}`,
          maxLength,
        );
      }

      if (block.type === "cohort-health-dashboard" && block.cohorts.length > 0) {
        const summary = getCohortHealthSummary(block);

        return truncateText(
          `${block.title}: ${summary.totalSeatsSold}/${summary.totalCapacity} seats sold, ${summary.fillPercent}% filled, ${summary.atRiskCount} at-risk cohorts.`,
          maxLength,
        );
      }

      if (block.type === "eisenhower-matrix" && block.tasks.length > 0) {
        const summary = getEisenhowerMatrixSummary(block);

        return truncateText(
          `${block.title}: ${summary.prioritizedTasks.filter((task) => !task.completed).length} open tasks, ${summary.overdueCount} overdue, ${summary.completedCount} completed.`,
          maxLength,
        );
      }

      if (block.type === "leadership-rhythm-planner" && block.meetings.length > 0) {
        const summary = getLeadershipRhythmPlannerSummary(block);

        return truncateText(
          `${block.title}: ${summary.cadenceHealthPercent}% cadence health with ${summary.upcomingCount} upcoming and ${summary.missedCount} missed meetings.`,
          maxLength,
        );
      }

      if (block.type === "kanban" && block.cards.length > 0) {
        return truncateText(
          `${block.title}: ${block.cards.length} cards across ${block.columns.length} columns.`,
          maxLength,
        );
      }

      if (block.type === "timeline" && block.milestones.length > 0) {
        return truncateText(
          `${block.title}: ${block.milestones.length} milestones tracked.`,
          maxLength,
        );
      }

      if (block.type === "habit-grid" && block.habits.length > 0) {
        const summary = getHabitGridSummary(block);

        return truncateText(
          `${block.title}: ${summary.overallPercent}% overall consistency across ${summary.totalHabits} habits.`,
          maxLength,
        );
      }

      if (block.type === "process" && block.steps.length > 0) {
        const summary = getProcessSummary(block);

        return truncateText(
          `${block.title}: ${summary.completedSteps}/${summary.totalSteps} steps complete (${summary.percent}%).`,
          maxLength,
        );
      }

      if (block.type === "2x2-matrix") {
        const summary = get2x2MatrixSummary(block);

        if (summary.itemCount > 0) {
          return truncateText(
            `${block.title}: ${summary.itemCount} items mapped across four quadrants.`,
            maxLength,
          );
        }
      }

      if (block.type === "skills-heat-map" && block.members.length > 0) {
        const summary = getSkillsHeatMapSummary(block);

        return truncateText(
          `${block.title}: ${summary.overallAverage}/10 average skill score with ${summary.criticalGapCount} critical gaps.`,
          maxLength,
        );
      }

      if (block.type === "delegation-matrix" && block.items.length > 0) {
        const summary = getDelegationMatrixSummary(block);

        return truncateText(
          `${block.title}: ${summary.pendingHoursPerWeek} founder hours still need delegation.`,
          maxLength,
        );
      }

      if (block.type === "talent-grid" && block.members.length > 0) {
        const summary = getTalentGridSummary(block);

        return truncateText(
          `${block.title}: ${summary.superstarCount} superstars and ${summary.riskCount} risk profiles identified.`,
          maxLength,
        );
      }

      if (block.type === "seat-planner" && block.seats.length > 0) {
        const summary = getSeatPlannerSummary(block);

        return truncateText(
          `${block.title}: ${summary.uncoveredSeats} uncovered seats and ${summary.overloadedSeats} overloaded seats.`,
          maxLength,
        );
      }

      if (block.type === "deal-scoring-matrix" && block.deals.length > 0) {
        const summary = getDealScoringMatrixSummary(block);

        return truncateText(
          `${block.title}: ${summary.averageScore}/100 average score across ${summary.dealCount} deals.`,
          maxLength,
        );
      }

      if (block.type === "pipeline-funnel" && block.deals.length > 0) {
        const summary = getPipelineFunnelSummary(block);

        return truncateText(
          `${block.title}: ${formatEgpValue(summary.totalValue)} across ${summary.dealCount} pipeline deals.`,
          maxLength,
        );
      }

      if (block.type === "forecast-confidence-board" && block.deals.length > 0) {
        const summary = getForecastConfidenceBoardSummary(block);

        return truncateText(
          `${block.title}: ${formatEgpValue(summary.weightedForecast)} weighted forecast with ${summary.coveragePercent}% coverage.`,
          maxLength,
        );
      }

      if (block.type === "content-pipeline" && block.items.length > 0) {
        const summary = getContentPipelineSummary(block);

        return truncateText(
          `${block.title}: ${summary.publishedCount} published, ${summary.reviewCount} waiting in review.`,
          maxLength,
        );
      }

      if (block.type === "content-quality-radar") {
        const summary = getContentQualityRadarSummary(block);

        return truncateText(
          `${block.title}: ${summary.averageScore}/10 average quality score${summary.weakestDimension ? `, weakest in ${workspaceContentQualityDimensionLabels[summary.weakestDimension]}` : ""}.`,
          maxLength,
        );
      }

      if (block.type === "content-roi-tracker" && block.items.length > 0) {
        const summary = getContentRoiTrackerSummary(block);

        return truncateText(
          `${block.title}: ${summary.totalInfluencedLeads} influenced leads, ${summary.topPlatform ? `${workspaceContentPlatformLabels[summary.topPlatform]} is leading.` : `${summary.averageScore} average ROI score.`}`,
          maxLength,
        );
      }

      if (block.type === "authority-scorecard") {
        const summary = getAuthorityScorecardSummary(block);

        return truncateText(
          `${block.title}: ${summary.atTargetCount}/${summary.metricCount} metrics on target with ${summary.averageProgress}% average progress.`,
          maxLength,
        );
      }

      if (block.type === "hook-bank" && block.hooks.length > 0) {
        const summary = getHookBankSummary(block);

        return truncateText(
          `${block.title}: ${summary.hookCount} hooks with ${summary.averageScore}/10 average score${summary.topCategory ? `, strongest in ${summary.topCategory}.` : "."}`,
          maxLength,
        );
      }

      if (block.type === "message-house") {
        const summary = getMessageHouseSummary(block);

        return truncateText(
          `${block.title}: ${summary.filledSectionCount}/7 sections filled${summary.latestStressTestAvailable ? ", stress test saved." : "."}`,
          maxLength,
        );
      }

      if (block.type === "scorecard" && block.metrics.length > 0) {
        return truncateText(
          `${block.title}: ${block.metrics.length} metrics being tracked.`,
          maxLength,
        );
      }

      if (block.type === "okr-tracker" && block.objectives.length > 0) {
        const summary = getOkrTrackerSummary(block);

        return truncateText(
          `${block.title}: ${summary.averageProgress}% average progress across ${summary.objectiveCount} objectives.`,
          maxLength,
        );
      }

      if (
        block.type === "decision-matrix" &&
        (trimToEmpty(block.question) || block.options.length > 0)
      ) {
        const summary = getDecisionMatrixSummary(block);
        const winner = summary.optionScores.find((option) => option.isWinner);

        return truncateText(
          `${block.title}: ${trimToEmpty(block.question) || `${winner?.label || "Leading option"} is ahead with ${winner?.totalScore ?? 0} points.`}`,
          maxLength,
        );
      }

      if (block.type === "business-model-canvas" && summaryBusinessModelCanvasHasContent(block)) {
        return truncateText(summarizeBusinessModelCanvasForPreview(block), maxLength);
      }

      if (block.type === "assumption-tracker" && block.assumptions.length > 0) {
        const summary = getAssumptionTrackerSummary(block);

        return truncateText(
          `${block.title}: ${summary.atRiskCount} at-risk assumptions out of ${summary.total}.`,
          maxLength,
        );
      }

      if (block.type === "profitability-cash-flow" && block.clients.length > 0) {
        const summary = getProfitabilityCashFlowSummary(block);

        return truncateText(
          `${block.title}: ${formatEgpValue(summary.totalProfit)} profit at ${summary.marginPercent}% margin.`,
          maxLength,
        );
      }

      if (block.type === "pricing-simulator") {
        const summary = getPricingSimulatorSummary(block);

        return truncateText(
          `${block.title}: ${formatEgpValue(summary.projectedRevenue)} projected revenue and ${formatEgpValue(summary.minimumRetainerPerClient)} minimum retainer per client.`,
          maxLength,
        );
      }

      if (block.type === "collections-tracker" && block.invoices.length > 0) {
        const summary = getCollectionsTrackerSummary(block);

        return truncateText(
          `${block.title}: ${formatEgpValue(summary.totalOutstanding)} outstanding with ${summary.highRiskCount} high-risk invoices.`,
          maxLength,
        );
      }
    }
  }

  return "Open the node to add tabs, blocks, and working context.";
}

export function getWorkspaceNodeStats(node: WorkspaceNode, allNodes?: WorkspaceNode[]) {
  const tabsCount = node.tabs.length;
  const blocksCount = node.tabs.reduce((count, tab) => count + tab.blocks.length, 0);
  const tasks = collectWorkspaceNodeTasks(node, allNodes);
  const completedTasks = tasks.filter(({ task }) => task.completed).length;
  const overdueTasks = getTimeOrchestratorSummary(node, {}, new Date(), allNodes).overdue.length;

  return {
    tabsCount,
    blocksCount,
    totalTasks: tasks.length,
    completedTasks,
    overdueTasks,
  };
}

export function getWorkspaceNodeDashboardSelectableBlocks(
  node: WorkspaceNode,
): WorkspaceNodeDashboardSelectableBlock[] {
  return node.tabs.flatMap((tab) =>
    tab.blocks.map((block) => ({
      tabId: tab.id,
      tabTitle: getDisplayTabTitle(tab),
      blockId: block.id,
      blockTitle: getDisplayBlockTitle(block),
      blockType: block.type,
    })),
  );
}

export function getWorkspaceNodeDashboardDetails(
  node: WorkspaceNode,
  allNodes?: WorkspaceNode[],
): WorkspaceNodeDashboardDetail[] {
  return node.dashboard.featuredBlocks.flatMap((selection) => {
    const tab = node.tabs.find((entry) => entry.id === selection.tabId);
    const block = tab?.blocks.find((entry) => entry.id === selection.blockId);

    if (!tab || !block) {
      return [];
    }

    return [buildWorkspaceNodeDashboardDetail(node, tab, block, allNodes)];
  });
}

export function getTrackerTrend(block: WorkspaceTrackerBlock): WorkspaceTrackerTrend {
  const values = block.entries.map((entry) => entry.value);

  if (values.length === 0) {
    return {
      direction: "flat",
      delta: 0,
      percentChange: null,
      points: [],
    };
  }

  const first = values[0]!;
  const last = values[values.length - 1]!;
  const delta = Number((last - first).toFixed(2));
  const percentChange =
    first === 0 ? null : Number((((last - first) / Math.abs(first)) * 100).toFixed(1));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points =
    max === min
      ? values.map(() => 56)
      : values.map((value) => Math.round(((value - min) / (max - min)) * 100));

  return {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    delta,
    percentChange,
    points,
  };
}

export function getDecisionSummary(block: WorkspaceDecisionBlock): WorkspaceDecisionSummary {
  const prosWeight = block.pros.reduce((sum, item) => sum + item.weight, 0);
  const consWeight = block.cons.reduce((sum, item) => sum + item.weight, 0);
  const totalScore = prosWeight - consWeight;

  return {
    prosWeight,
    consWeight,
    totalScore,
    signal: totalScore > 1 ? "lean-yes" : totalScore < -1 ? "lean-no" : "balanced",
  };
}

export function evaluateCustomBlockFormula(
  expression: string | null | undefined,
  values: Record<string, WorkspaceCustomBlockValue>,
) {
  const source = expression?.trim();

  if (!source) {
    return null;
  }

  const numericValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "number" ? value : 0]),
  );

  const substituted = source.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (identifier) =>
    String(numericValues[identifier] ?? 0),
  );

  if (!/^[0-9+\-*/().\s]+$/.test(substituted)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${substituted});`)();

    return typeof result === "number" && Number.isFinite(result) ? Number(result.toFixed(2)) : null;
  } catch {
    return null;
  }
}

export function fillCustomBlockPromptTemplate(
  template: WorkspaceCustomBlockTemplate,
  block: WorkspaceCustomBlock,
) {
  const promptTemplate = template.aiPromptTemplate?.trim();

  if (!promptTemplate) {
    return "";
  }

  const valuePairs = Object.entries(block.values).map(([key, value]) => [
    key,
    typeof value === "boolean" ? (value ? "true" : "false") : String(value ?? ""),
  ]);

  return promptTemplate.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const match = valuePairs.find(([entryKey]) => entryKey === key);

    return match?.[1] ?? "";
  });
}

export function generateWorkspacePromptOutput(node: WorkspaceNode, prompt: string) {
  const normalizedPrompt = prompt.trim();
  const stats = getWorkspaceNodeStats(node);
  const timeSummary = getTimeOrchestratorSummary(node);
  const decisionBlocks = node.tabs.flatMap((tab) =>
    tab.blocks.filter(
      (block): block is WorkspaceDecisionBlock | WorkspaceDecisionMatrixBlock =>
        block.type === "decision" || block.type === "decision-matrix",
    ),
  );

  const intro = [
    `Node: ${node.title}`,
    `Tabs: ${stats.tabsCount}`,
    `Blocks: ${stats.blocksCount}`,
    `Tasks: ${stats.completedTasks}/${stats.totalTasks} complete`,
  ].join(" | ");

  if (/decision|recommend|choose/i.test(normalizedPrompt) && decisionBlocks.length > 0) {
    const recommendations = decisionBlocks.map((block) => {
      if (block.type === "decision-matrix") {
        const summary = getDecisionMatrixSummary(block);
        const winner = summary.optionScores.find((option) => option.isWinner);
        const base = `${block.title}: ${winner ? `${winner.label} leads with ${winner.totalScore}` : "matrix is not decided yet"}`;

        return trimToEmpty(block.question) ? `${base}. Question: ${block.question.trim()}` : base;
      }

      const summary = getDecisionSummary(block);
      const base = `${block.title}: score ${summary.totalScore} (${summary.signal})`;

      if (trimToEmpty(block.recommendation)) {
        return `${base}. Recommendation: ${block.recommendation.trim()}`;
      }

      return base;
    });

    return `${intro}\n\nDecision scan:\n- ${recommendations.join("\n- ")}`;
  }

  if (/people|team|hire|hiring|delegat|skills|talent|seat|org/i.test(normalizedPrompt)) {
    const peopleLines = node.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => {
        if (block.type === "skills-heat-map") {
          const summary = getSkillsHeatMapSummary(block);
          const strongestDimension = getStrongestSkillDimension(summary.averageByDimension);

          return [
            `${block.title}: ${summary.overallAverage}/10 average skill score, ${summary.criticalGapCount} critical gaps${strongestDimension ? `, strongest in ${getSkillsHeatMapDimensionLabel(block, strongestDimension)}` : ""}.`,
          ];
        }

        if (block.type === "delegation-matrix") {
          const summary = getDelegationMatrixSummary(block);

          return [
            `${block.title}: ${summary.pendingHoursPerWeek} pending founder hours, ${summary.stuckCount} stuck items, weekly misallocation value ${summary.pendingRecoverableValue}.`,
          ];
        }

        if (block.type === "talent-grid") {
          const summary = getTalentGridSummary(block);

          return [
            `${block.title}: ${summary.superstarCount} superstars, ${summary.growthStarCount} growth stars, ${summary.riskCount} risk profiles.`,
          ];
        }

        if (block.type === "seat-planner") {
          const summary = getSeatPlannerSummary(block);

          return [
            `${block.title}: ${summary.uncoveredSeats} uncovered seats, ${summary.fragileSeats} fragile seats, ${summary.overloadedSeats} overloaded seats.`,
          ];
        }

        return [];
      }),
    );

    if (peopleLines.length > 0) {
      return `${intro}\n\nPeople scan:\n- ${peopleLines.join("\n- ")}`;
    }
  }

  if (/sales|deal|pipeline|forecast|revenue|close/i.test(normalizedPrompt)) {
    const salesLines = node.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => {
        if (block.type === "deal-scoring-matrix") {
          const summary = getDealScoringMatrixSummary(block);
          const topTemperature = getTopSalesTemperature(block);

          return [
            `${block.title}: ${summary.dealCount} deals, ${summary.averageScore}/100 average score, ${formatEgpValue(summary.totalValue)} total value${topTemperature ? `, mostly ${workspaceSalesTemperatureLabels[topTemperature].toLowerCase()} deals` : ""}.`,
          ];
        }

        if (block.type === "pipeline-funnel") {
          const summary = getPipelineFunnelSummary(block);
          const leadingStage = summary.stageSummaries
            .slice()
            .sort((left, right) => right.totalValue - left.totalValue)[0];

          return [
            `${block.title}: ${formatEgpValue(summary.totalValue)} in pipeline, ${formatEgpValue(summary.closedValue)} closed${leadingStage ? `, biggest stage is ${leadingStage.label} at ${formatEgpValue(leadingStage.totalValue)}` : ""}.`,
          ];
        }

        if (block.type === "forecast-confidence-board") {
          const summary = getForecastConfidenceBoardSummary(block);
          const topBucket = getTopForecastBucket(block);

          return [
            `${block.title}: ${formatEgpValue(summary.weightedForecast)} weighted forecast, ${formatEgpValue(summary.commitRevenue)} commit, ${formatEgpValue(summary.atRiskValue)} at risk${topBucket ? `, largest bucket is ${workspaceSalesForecastBucketLabels[topBucket]}` : ""}.`,
          ];
        }

        return [];
      }),
    );

    if (salesLines.length > 0) {
      return `${intro}\n\nSales scan:\n- ${salesLines.join("\n- ")}`;
    }
  }

  if (/brand|message|hook|authority|voice|position/i.test(normalizedPrompt)) {
    const brandLines = node.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => {
        if (block.type === "authority-scorecard") {
          const summary = getAuthorityScorecardSummary(block);

          return [
            `${block.title}: ${summary.atTargetCount}/${summary.metricCount} metrics on target, ${summary.averageProgress}% average progress.`,
          ];
        }

        if (block.type === "hook-bank") {
          const summary = getHookBankSummary(block);

          return [
            `${block.title}: ${summary.hookCount} hooks, ${summary.averageScore}/10 average score${summary.topCategory ? `, strongest category is ${summary.topCategory}` : ""}.`,
          ];
        }

        if (block.type === "message-house") {
          const summary = getMessageHouseSummary(block);

          return [
            `${block.title}: ${summary.filledSectionCount}/7 sections filled${summary.latestStressTestAvailable ? ", stress test already saved." : ", no stress test saved yet."}`,
          ];
        }

        return [];
      }),
    );

    if (brandLines.length > 0) {
      return `${intro}\n\nBrand scan:\n- ${brandLines.join("\n- ")}`;
    }
  }

  if (/finance|cash|margin|pricing|invoice|collections|receivables/i.test(normalizedPrompt)) {
    const financeLines = node.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => {
        if (block.type === "profitability-cash-flow") {
          const summary = getProfitabilityCashFlowSummary(block);

          return [
            `${block.title}: ${formatEgpValue(summary.totalRevenue)} revenue, ${formatEgpValue(summary.totalProfit)} profit, ${summary.marginPercent}% margin.`,
          ];
        }

        if (block.type === "pricing-simulator") {
          const summary = getPricingSimulatorSummary(block);

          return [
            `${block.title}: ${formatEgpValue(summary.projectedRevenue)} projected revenue, ${formatEgpValue(summary.minimumRetainerPerClient)} minimum retainer per client, ${formatEgpValue(summary.projectedProfit)} projected profit.`,
          ];
        }

        if (block.type === "collections-tracker") {
          const summary = getCollectionsTrackerSummary(block);

          return [
            `${block.title}: ${formatEgpValue(summary.totalOutstanding)} outstanding, ${formatEgpValue(summary.overdueAmount)} overdue, ${summary.highRiskCount} high-risk invoices.`,
          ];
        }

        return [];
      }),
    );

    if (financeLines.length > 0) {
      return `${intro}\n\nFinance scan:\n- ${financeLines.join("\n- ")}`;
    }
  }

  if (/task|priority|next|plan|schedule/i.test(normalizedPrompt)) {
    const lines =
      timeSummary.suggestedNextActions.length > 0
        ? timeSummary.suggestedNextActions.map(
          ({ task, tabTitle, blockTitle }) =>
            `${task.text} [${tabTitle} / ${blockTitle}]${task.domain ? `, ${getWorkspaceTaskDomainLabel(task.domain)}` : ""}${task.dueDate ? ` due ${task.dueDate}` : ""}${task.priority ? `, ${task.priority} priority` : ""}, urgency ${task.urgency}/10, importance ${task.importance}/10${task.estimateMinutes ? `, ${task.estimateMinutes}m` : ""}`,
        )
        : ["No outstanding tasks found."];

    return `${intro}\n\nSuggested next actions:\n- ${lines.join("\n- ")}`;
  }

  const notes = node.tabs
    .flatMap((tab) =>
      tab.blocks.flatMap((block) =>
        block.type === "notes" && trimToEmpty(block.body)
          ? [`${tab.title} / ${block.title}: ${truncateText(block.body, 180)}`]
          : [],
      ),
    )
    .slice(0, 3);

  const summaryLines = [
    `Overdue tasks: ${timeSummary.overdue.length}`,
    `Upcoming tasks: ${timeSummary.upcoming.length}`,
    `High priority tasks: ${timeSummary.highPriority.length}`,
    `Open task load: ${timeSummary.totalOpenTasks} tasks / ${timeSummary.totalEstimateMinutes} minutes`,
  ];

  if (notes.length > 0) {
    summaryLines.push(...notes);
  }

  return `${intro}\n\nPrompt: ${normalizedPrompt || "General summary"}\n\n- ${summaryLines.join("\n- ")}`;
}
