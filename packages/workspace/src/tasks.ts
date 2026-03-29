import { WORKSPACE_TASK_DOMAINS, WORKSPACE_TASK_QUADRANTS } from "./constants";
import {
  workspaceLeadershipRhythmFilterSchema,
  workspaceTimeOrchestratorSettingsSchema,
} from "./schemas";
import {
  getDueDateValue,
  getDisplayBlockTitle,
  getDisplayTabTitle,
  getTodayValue,
  normalizeSelection,
  trimToEmpty,
} from "./shared";
import type {
  WorkspaceCollectedTask,
  WorkspaceEisenhowerDomainAllocation,
  WorkspaceEisenhowerMatrixBlock,
  WorkspaceEisenhowerMatrixSummary,
  WorkspaceEisenhowerQuadrantSummary,
  WorkspaceLeadershipMeetingStatus,
  WorkspaceLeadershipRhythm,
  WorkspaceLeadershipRhythmFilter,
  WorkspaceLeadershipRhythmMeeting,
  WorkspaceLeadershipRhythmPlannerBlock,
  WorkspaceLeadershipRhythmSummary,
  WorkspaceNode,
  WorkspaceTask,
  WorkspaceTaskDomain,
  WorkspaceTaskListBlock,
  WorkspaceTaskPriority,
  WorkspaceTaskQuadrant,
  WorkspaceTimeOrchestratorQuadrantSummary,
  WorkspaceTimeOrchestratorSettings,
  WorkspaceTimeOrchestratorSummary,
} from "./types";

export function createWorkspaceTimeOrchestratorSettings(
  partial: Partial<WorkspaceTimeOrchestratorSettings> = {},
): WorkspaceTimeOrchestratorSettings {
  return workspaceTimeOrchestratorSettingsSchema.parse({
    domains: normalizeSelection(partial.domains, WORKSPACE_TASK_DOMAINS, WORKSPACE_TASK_DOMAINS),
    includeUnassigned: partial.includeUnassigned ?? true,
    quadrants: normalizeSelection(
      partial.quadrants,
      WORKSPACE_TASK_QUADRANTS,
      WORKSPACE_TASK_QUADRANTS,
    ),
  });
}

export function getTaskListProgress(block: WorkspaceTaskListBlock) {
  const total = block.tasks.length;
  const completed = block.tasks.filter((task) => task.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percent,
  };
}

export function collectWorkspaceNodeTasks(node: WorkspaceNode) {
  return node.tabs.flatMap((tab) =>
    tab.blocks.flatMap((block) => {
      if (block.type !== "task-list" && block.type !== "eisenhower-matrix") {
        return [];
      }

      return block.tasks.map(
        (task) =>
          ({
            blockId: block.id,
            blockTitle: getDisplayBlockTitle(block),
            tabId: tab.id,
            tabTitle: getDisplayTabTitle(tab),
            task,
          }) satisfies WorkspaceCollectedTask,
      );
    }),
  );
}

function getPriorityScore(priority: WorkspaceTaskPriority | null | undefined) {
  switch (priority) {
    case "high":
      return 12;
    case "medium":
      return 7;
    case "low":
      return 3;
    default:
      return 0;
  }
}

export function getWorkspaceTaskDomainLabel(domain: WorkspaceTaskDomain | null | undefined) {
  switch (domain) {
    case "strategy":
      return "Strategy";
    case "people":
      return "People";
    case "sales":
      return "Sales";
    case "content":
      return "Content";
    case "brand":
      return "Brand";
    case "finance":
      return "Finance";
    case "education":
      return "Education";
    case "orchestrator":
      return "Orchestrator";
    default:
      return "Unassigned";
  }
}

export function getWorkspaceTaskQuadrantLabel(quadrant: WorkspaceTaskQuadrant) {
  switch (quadrant) {
    case "do":
      return "Do first";
    case "schedule":
      return "Schedule";
    case "delegate":
      return "Delegate";
    case "eliminate":
      return "Eliminate";
  }
}

export const workspaceLeadershipRhythmLabels: Record<WorkspaceLeadershipRhythm, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export const workspaceLeadershipMeetingStatusLabels: Record<
  WorkspaceLeadershipMeetingStatus,
  string
> = {
  scheduled: "Scheduled",
  missed: "Missed",
  done: "Done",
  "needs-reschedule": "Needs Reschedule",
};

export const workspaceLeadershipRhythmFilterLabels: Record<
  WorkspaceLeadershipRhythmFilter,
  string
> = {
  all: "All",
  missed: "Missed",
  upcoming: "Upcoming",
};

export function getWorkspaceTaskQuadrant(task: WorkspaceTask): WorkspaceTaskQuadrant {
  const highUrgency = task.urgency >= 7;
  const highImportance = task.importance >= 7;

  if (highUrgency && highImportance) {
    return "do";
  }

  if (highImportance) {
    return "schedule";
  }

  if (highUrgency) {
    return "delegate";
  }

  return "eliminate";
}

function getTaskEstimatePenalty(task: WorkspaceTask) {
  return Math.min(task.estimateMinutes / 30, 12);
}

function getTaskUrgencyScore(task: WorkspaceTask, now = new Date()) {
  if (task.completed) {
    return Number.NEGATIVE_INFINITY;
  }

  const baseScore =
    getPriorityScore(task.priority) +
    task.urgency * 4 +
    task.importance * 3 -
    getTaskEstimatePenalty(task);

  if (!task.dueDate) {
    return baseScore;
  }

  const todayValue = getTodayValue(now);
  const dueDateValue = getDueDateValue(task.dueDate);
  const dayDelta = Math.round((dueDateValue - todayValue) / 86_400_000);

  if (dayDelta < 0) {
    return baseScore + Math.abs(dayDelta) * 8 + 18;
  }

  if (dayDelta === 0) {
    return baseScore + 16;
  }

  if (dayDelta <= 3) {
    return baseScore + (4 - dayDelta) * 5;
  }

  if (dayDelta <= 7) {
    return baseScore + 2;
  }

  return baseScore;
}

export function getTimeOrchestratorSummary(
  node: WorkspaceNode,
  settings: Partial<WorkspaceTimeOrchestratorSettings> = {},
  now = new Date(),
): WorkspaceTimeOrchestratorSummary {
  const resolvedSettings = createWorkspaceTimeOrchestratorSettings(settings);
  const tasks = collectWorkspaceNodeTasks(node).filter(({ task }) => {
    if (task.completed) {
      return false;
    }

    const domainAllowed = task.domain
      ? resolvedSettings.domains.includes(task.domain)
      : resolvedSettings.includeUnassigned;
    const quadrantAllowed = resolvedSettings.quadrants.includes(getWorkspaceTaskQuadrant(task));

    return domainAllowed && quadrantAllowed;
  });
  const todayValue = getTodayValue(now);
  const totalEstimateMinutes = tasks.reduce((sum, { task }) => sum + task.estimateMinutes, 0);
  const averageUrgency =
    tasks.length === 0
      ? 0
      : Number((tasks.reduce((sum, { task }) => sum + task.urgency, 0) / tasks.length).toFixed(1));
  const averageImportance =
    tasks.length === 0
      ? 0
      : Number(
          (tasks.reduce((sum, { task }) => sum + task.importance, 0) / tasks.length).toFixed(1),
        );

  const overdue = tasks
    .filter(({ task }) => task.dueDate && getDueDateValue(task.dueDate) < todayValue)
    .sort(
      (left, right) => getDueDateValue(left.task.dueDate!) - getDueDateValue(right.task.dueDate!),
    );

  const upcoming = tasks
    .filter(({ task }) => {
      if (!task.dueDate) {
        return false;
      }

      const value = getDueDateValue(task.dueDate);
      const dayDelta = Math.round((value - todayValue) / 86_400_000);

      return dayDelta >= 0 && dayDelta <= 7;
    })
    .sort(
      (left, right) => getDueDateValue(left.task.dueDate!) - getDueDateValue(right.task.dueDate!),
    );

  const highPriority = tasks.filter(
    ({ task }) => task.priority === "high" || task.urgency >= 8 || task.importance >= 8,
  );
  const suggestedNextActions = [...tasks]
    .sort(
      (left, right) => getTaskUrgencyScore(right.task, now) - getTaskUrgencyScore(left.task, now),
    )
    .slice(0, 5);
  const quadrants = {
    do: {
      key: "do",
      label: getWorkspaceTaskQuadrantLabel("do"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    schedule: {
      key: "schedule",
      label: getWorkspaceTaskQuadrantLabel("schedule"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    delegate: {
      key: "delegate",
      label: getWorkspaceTaskQuadrantLabel("delegate"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
    eliminate: {
      key: "eliminate",
      label: getWorkspaceTaskQuadrantLabel("eliminate"),
      count: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceCollectedTask[],
    },
  } satisfies Record<WorkspaceTaskQuadrant, WorkspaceTimeOrchestratorQuadrantSummary>;

  for (const item of tasks) {
    const quadrant = quadrants[getWorkspaceTaskQuadrant(item.task)];
    quadrant.count += 1;
    quadrant.estimateMinutes += item.task.estimateMinutes;
    quadrant.tasks.push(item);
  }

  for (const quadrant of Object.values(quadrants)) {
    quadrant.tasks.sort(
      (left, right) => getTaskUrgencyScore(right.task, now) - getTaskUrgencyScore(left.task, now),
    );
  }

  const domainGroups = new Map();

  for (const item of tasks) {
    const key = item.task.domain ?? null;
    const existing = domainGroups.get(key);

    if (existing) {
      existing.count += 1;
      existing.estimateMinutes += item.task.estimateMinutes;
      existing.tasks.push(item);
      continue;
    }

    domainGroups.set(key, {
      domain: key,
      label: getWorkspaceTaskDomainLabel(key),
      count: 1,
      estimateMinutes: item.task.estimateMinutes,
      tasks: [item],
    });
  }

  const domainBreakdown = [...domainGroups.values()].sort(
    (left, right) => right.estimateMinutes - left.estimateMinutes || right.count - left.count,
  );

  return {
    overdue,
    upcoming,
    highPriority,
    suggestedNextActions,
    totalOpenTasks: tasks.length,
    totalEstimateMinutes,
    averageUrgency,
    averageImportance,
    domainBreakdown,
    quadrants,
  };
}

export function sortEisenhowerTasks(tasks: WorkspaceTask[], now = new Date()) {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return Number(left.completed) - Number(right.completed);
    }

    const scoreDelta = getTaskUrgencyScore(right, now) - getTaskUrgencyScore(left, now);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return trimToEmpty(left.text).localeCompare(trimToEmpty(right.text));
  });
}

export function getEisenhowerMatrixSummary(
  block: WorkspaceEisenhowerMatrixBlock,
  now = new Date(),
): WorkspaceEisenhowerMatrixSummary {
  const openTasks = block.tasks.filter((task) => !task.completed);
  const totalEstimateMinutes = block.tasks.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const domainMap = new Map<WorkspaceTaskDomain | null, WorkspaceEisenhowerDomainAllocation>();
  const quadrants = {
    do: {
      key: "do",
      label: getWorkspaceTaskQuadrantLabel("do"),
      taskCount: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceTask[],
    },
    schedule: {
      key: "schedule",
      label: getWorkspaceTaskQuadrantLabel("schedule"),
      taskCount: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceTask[],
    },
    delegate: {
      key: "delegate",
      label: getWorkspaceTaskQuadrantLabel("delegate"),
      taskCount: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceTask[],
    },
    eliminate: {
      key: "eliminate",
      label: getWorkspaceTaskQuadrantLabel("eliminate"),
      taskCount: 0,
      estimateMinutes: 0,
      tasks: [] as WorkspaceTask[],
    },
  } satisfies Record<WorkspaceTaskQuadrant, WorkspaceEisenhowerQuadrantSummary>;

  for (const task of openTasks) {
    const quadrant = quadrants[getWorkspaceTaskQuadrant(task)];
    quadrant.taskCount += 1;
    quadrant.estimateMinutes += task.estimateMinutes;
    quadrant.tasks.push(task);

    const key = task.domain ?? null;
    const existing = domainMap.get(key);

    if (existing) {
      existing.taskCount += 1;
      existing.estimateMinutes += task.estimateMinutes;
      continue;
    }

    domainMap.set(key, {
      domain: key,
      label: getWorkspaceTaskDomainLabel(key),
      taskCount: 1,
      estimateMinutes: task.estimateMinutes,
    });
  }

  for (const quadrant of Object.values(quadrants)) {
    quadrant.tasks = sortEisenhowerTasks(quadrant.tasks, now);
  }

  return {
    totalTaskCount: block.tasks.length,
    totalEstimateMinutes,
    overdueCount: openTasks.filter(
      (task) => task.dueDate && getDueDateValue(task.dueDate) < getTodayValue(now),
    ).length,
    completedCount: block.tasks.filter((task) => task.completed).length,
    activeDomainCount: new Set(block.tasks.map((task) => task.domain).filter(Boolean)).size,
    domainAllocation: [...domainMap.values()].sort(
      (left, right) =>
        right.estimateMinutes - left.estimateMinutes || right.taskCount - left.taskCount,
    ),
    quadrants,
    prioritizedTasks: sortEisenhowerTasks(block.tasks, now),
  };
}

export function buildEisenhowerBattlePlanPrompt(block: WorkspaceEisenhowerMatrixBlock) {
  const taskLines =
    block.tasks.length > 0
      ? sortEisenhowerTasks(block.tasks).map((task, index) => {
          const meta = [
            task.domain
              ? `domain ${getWorkspaceTaskDomainLabel(task.domain)}`
              : "domain unassigned",
            `urgency ${task.urgency}/10`,
            `importance ${task.importance}/10`,
            `${task.estimateMinutes} minutes`,
            `quadrant ${getWorkspaceTaskQuadrantLabel(getWorkspaceTaskQuadrant(task))}`,
            task.completed ? "completed" : "open",
            task.dueDate ? `due ${task.dueDate}` : "",
          ]
            .filter(Boolean)
            .join(", ");

          return `${index + 1}. ${task.text} (${meta})`;
        })
      : ["No tasks recorded."];

  return [
    "You are the Orchestrator agent for a CEO operating system.",
    "Review the Eisenhower matrix task list below and produce a battle plan in markdown.",
    "",
    "Output requirements:",
    "- Start with a one-paragraph read on the current load.",
    "- Then give the top 5 priorities in rank order with rationale.",
    "- Then give what to schedule, delegate, and eliminate this week.",
    "- End with a 3-day execution sequence.",
    "",
    "Tasks:",
    ...taskLines.map((line) => `- ${line}`),
  ].join("\n");
}

export function createWorkspaceLeadershipRhythmFilter(
  value: WorkspaceLeadershipRhythmFilter | null | undefined,
) {
  return workspaceLeadershipRhythmFilterSchema.parse(value ?? "all");
}

export function isLeadershipMeetingUpcoming(
  meeting: WorkspaceLeadershipRhythmMeeting,
  now = new Date(),
) {
  if (meeting.status !== "scheduled" || !meeting.nextDate) {
    return false;
  }

  return getDueDateValue(meeting.nextDate) >= getTodayValue(now);
}

export function isLeadershipMeetingMissed(
  meeting: WorkspaceLeadershipRhythmMeeting,
  now = new Date(),
) {
  if (meeting.status === "missed") {
    return true;
  }

  return (
    meeting.status === "scheduled" &&
    Boolean(meeting.nextDate) &&
    getDueDateValue(meeting.nextDate!) < getTodayValue(now)
  );
}

export function matchesLeadershipRhythmFilter(
  meeting: WorkspaceLeadershipRhythmMeeting,
  filter: WorkspaceLeadershipRhythmFilter,
  now = new Date(),
) {
  switch (filter) {
    case "missed":
      return isLeadershipMeetingMissed(meeting, now);
    case "upcoming":
      return isLeadershipMeetingUpcoming(meeting, now);
    default:
      return true;
  }
}

export function sortLeadershipRhythmMeetings(meetings: WorkspaceLeadershipRhythmMeeting[]) {
  return [...meetings].sort((left, right) => {
    const leftDate = left.nextDate ? getDueDateValue(left.nextDate) : Number.MAX_SAFE_INTEGER;
    const rightDate = right.nextDate ? getDueDateValue(right.nextDate) : Number.MAX_SAFE_INTEGER;

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    const rhythmOrder = {
      weekly: 0,
      monthly: 1,
      quarterly: 2,
    } satisfies Record<WorkspaceLeadershipRhythm, number>;

    const rhythmDelta = rhythmOrder[left.rhythm] - rhythmOrder[right.rhythm];

    if (rhythmDelta !== 0) {
      return rhythmDelta;
    }

    return trimToEmpty(left.name).localeCompare(trimToEmpty(right.name));
  });
}

export function getLeadershipRhythmPlannerSummary(
  block: WorkspaceLeadershipRhythmPlannerBlock,
  now = new Date(),
): WorkspaceLeadershipRhythmSummary {
  const scheduledCount = block.meetings.filter((meeting) => meeting.status === "scheduled").length;
  const missedCount = block.meetings.filter((meeting) =>
    isLeadershipMeetingMissed(meeting, now),
  ).length;
  const doneCount = block.meetings.filter((meeting) => meeting.status === "done").length;
  const needsRescheduleCount = block.meetings.filter(
    (meeting) => meeting.status === "needs-reschedule",
  ).length;
  const upcomingCount = block.meetings.filter((meeting) =>
    isLeadershipMeetingUpcoming(meeting, now),
  ).length;
  const onTrackCount = block.meetings.filter(
    (meeting) => meeting.status === "done" || isLeadershipMeetingUpcoming(meeting, now),
  ).length;

  return {
    totalMeetings: block.meetings.length,
    scheduledCount,
    missedCount,
    doneCount,
    needsRescheduleCount,
    upcomingCount,
    cadenceHealthPercent:
      block.meetings.length > 0 ? Math.round((onTrackCount / block.meetings.length) * 100) : 0,
  };
}
