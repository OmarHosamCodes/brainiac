import { WORKSPACE_TASK_DOMAINS, WORKSPACE_TASK_QUADRANTS } from "./constants";
import { workspaceTimeOrchestratorSettingsSchema } from "./schemas";
import {
  getDueDateValue,
  getDisplayBlockTitle,
  getDisplayTabTitle,
  getTodayValue,
  normalizeSelection,
} from "./shared";
import type {
  WorkspaceCollectedTask,
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
      if (block.type !== "task-list") {
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
