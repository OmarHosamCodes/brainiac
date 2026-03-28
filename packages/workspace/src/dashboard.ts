import {
  getDisplayBlockTitle,
  getDisplayTabTitle,
  getDueDateValue,
  getTodayValue,
  trimToEmpty,
  truncateText,
} from "./shared";
import {
  collectWorkspaceNodeTasks,
  getTimeOrchestratorSummary,
  getWorkspaceTaskDomainLabel,
} from "./tasks";
import type {
  WorkspaceBlock,
  WorkspaceCustomBlock,
  WorkspaceCustomBlockTemplate,
  WorkspaceCustomBlockValue,
  WorkspaceDecisionBlock,
  WorkspaceDecisionSummary,
  WorkspaceNode,
  WorkspaceNodeDashboardDetail,
  WorkspaceNodeDashboardSelectableBlock,
  WorkspaceNodeTab,
  WorkspaceScorecardMetric,
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

function getTimelineMilestoneSortValue(milestone: WorkspaceTimelineMilestone) {
  return milestone.date ? getDueDateValue(milestone.date) : Number.MAX_SAFE_INTEGER;
}

function isScorecardMetricOnTarget(metric: WorkspaceScorecardMetric) {
  return metric.target >= 0 ? metric.value >= metric.target : metric.value <= metric.target;
}

function buildWorkspaceNodeDashboardDetail(
  node: WorkspaceNode,
  tab: WorkspaceNodeTab,
  block: WorkspaceBlock,
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

  if (block.type === "time-orchestrator") {
    const orchestration = getTimeOrchestratorSummary(node, block.settings);
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

      if (block.type === "decision" && trimToEmpty(block.recommendation)) {
        return truncateText(block.recommendation, maxLength);
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

      if (block.type === "scorecard" && block.metrics.length > 0) {
        return truncateText(
          `${block.title}: ${block.metrics.length} metrics being tracked.`,
          maxLength,
        );
      }
    }
  }

  return "Open the node to add tabs, blocks, and working context.";
}

export function getWorkspaceNodeStats(node: WorkspaceNode) {
  const tabsCount = node.tabs.length;
  const blocksCount = node.tabs.reduce((count, tab) => count + tab.blocks.length, 0);
  const tasks = collectWorkspaceNodeTasks(node);
  const completedTasks = tasks.filter(({ task }) => task.completed).length;
  const overdueTasks = getTimeOrchestratorSummary(node).overdue.length;

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
): WorkspaceNodeDashboardDetail[] {
  return node.dashboard.featuredBlocks.flatMap((selection) => {
    const tab = node.tabs.find((entry) => entry.id === selection.tabId);
    const block = tab?.blocks.find((entry) => entry.id === selection.blockId);

    if (!tab || !block) {
      return [];
    }

    return [buildWorkspaceNodeDashboardDetail(node, tab, block)];
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
    tab.blocks.filter((block): block is WorkspaceDecisionBlock => block.type === "decision"),
  );

  const intro = [
    `Node: ${node.title}`,
    `Tabs: ${stats.tabsCount}`,
    `Blocks: ${stats.blocksCount}`,
    `Tasks: ${stats.completedTasks}/${stats.totalTasks} complete`,
  ].join(" | ");

  if (/decision|recommend|choose/i.test(normalizedPrompt) && decisionBlocks.length > 0) {
    const recommendations = decisionBlocks.map((block) => {
      const summary = getDecisionSummary(block);
      const base = `${block.title}: score ${summary.totalScore} (${summary.signal})`;

      if (trimToEmpty(block.recommendation)) {
        return `${base}. Recommendation: ${block.recommendation.trim()}`;
      }

      return base;
    });

    return `${intro}\n\nDecision scan:\n- ${recommendations.join("\n- ")}`;
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
