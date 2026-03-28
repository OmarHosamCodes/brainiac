import { WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS } from "./constants";
import { trimToEmpty, truncateText } from "./shared";
import type {
  WorkspaceAssumptionTrackerBlock,
  WorkspaceAssumptionTrackerSummary,
  WorkspaceBusinessModelCanvasAnalysis,
  WorkspaceBusinessModelCanvasBlock,
  WorkspaceBusinessModelCanvasCellKey,
  WorkspaceBusinessModelCanvasSummary,
  WorkspaceDecisionMatrixBlock,
  WorkspaceDecisionMatrixOption,
  WorkspaceDecisionMatrixSummary,
  WorkspaceNode,
  WorkspaceOkrHealth,
  WorkspaceOkrObjective,
  WorkspaceOkrTrackerBlock,
  WorkspaceOkrTrackerSummary,
  WorkspaceStrategicAssumption,
  WorkspaceStrategicAssumptionStatus,
} from "./types";

export const workspaceBusinessModelCanvasCellLabels: Record<
  WorkspaceBusinessModelCanvasCellKey,
  string
> = {
  keyPartners: "Key Partners",
  keyActivities: "Key Activities",
  keyResources: "Key Resources",
  valuePropositions: "Value Propositions",
  customerRelationships: "Customer Relationships",
  channels: "Channels",
  customerSegments: "Customer Segments",
  costStructure: "Cost Structure",
  revenueStreams: "Revenue Streams",
};

export const workspaceStrategicAssumptionStatusLabels: Record<
  WorkspaceStrategicAssumptionStatus,
  string
> = {
  validating: "Validating",
  confirmed: "Confirmed",
  "at-risk": "At Risk",
  false: "False",
};

function countCanvasSignals(value: string) {
  return value
    .split(/\n|,|;|•|-/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function getCanvasReadiness(
  filledCellCount: number,
): WorkspaceBusinessModelCanvasSummary["readiness"] {
  if (filledCellCount >= 7) {
    return "aligned";
  }

  if (filledCellCount >= 4) {
    return "forming";
  }

  return "early";
}

function getDecisionMatrixOptionTotal(
  block: WorkspaceDecisionMatrixBlock,
  option: WorkspaceDecisionMatrixOption,
) {
  return block.criteria.reduce((sum, criterion) => {
    return sum + (option.scores[criterion.id] ?? 0) * criterion.weight;
  }, 0);
}

export function getOkrHealth(progress: number): WorkspaceOkrHealth {
  if (progress >= 75) {
    return "healthy";
  }

  if (progress >= 40) {
    return "watch";
  }

  return "critical";
}

export function getOkrObjectiveProgress(objective: WorkspaceOkrObjective) {
  if (objective.keyResults.length === 0) {
    return 0;
  }

  const total = objective.keyResults.reduce((sum, keyResult) => sum + keyResult.progress, 0);
  return Math.round(total / objective.keyResults.length);
}

export function getOkrTrackerSummary(block: WorkspaceOkrTrackerBlock): WorkspaceOkrTrackerSummary {
  const objectives = block.objectives.map((objective) => {
    const progress = getOkrObjectiveProgress(objective);

    return {
      objectiveId: objective.id,
      title: objective.title.trim() || "Untitled objective",
      progress,
      health: getOkrHealth(progress),
      keyResultCount: objective.keyResults.length,
    };
  });

  const keyResultCount = block.objectives.reduce(
    (sum, objective) => sum + objective.keyResults.length,
    0,
  );
  const averageProgress =
    objectives.length > 0
      ? Math.round(
          objectives.reduce((sum, objective) => sum + objective.progress, 0) / objectives.length,
        )
      : 0;

  return {
    objectiveCount: objectives.length,
    keyResultCount,
    averageProgress,
    offTrackCount: objectives.filter((objective) => objective.health === "critical").length,
    healthyCount: objectives.filter((objective) => objective.health === "healthy").length,
    objectives,
  };
}

export function getDecisionMatrixSummary(
  block: WorkspaceDecisionMatrixBlock,
): WorkspaceDecisionMatrixSummary {
  const optionScores = block.options.map((option) => {
    const totalScore = getDecisionMatrixOptionTotal(block, option);

    return {
      optionId: option.id,
      label: option.label.trim() || "Untitled option",
      totalScore,
      averageScore:
        block.criteria.length > 0 ? Number((totalScore / block.criteria.length).toFixed(1)) : 0,
      progress: 0,
      isWinner: false,
    };
  });
  const leaderScore = optionScores.reduce(
    (max, optionScore) => Math.max(max, optionScore.totalScore),
    0,
  );
  const winnerCount = optionScores.filter(
    (optionScore) => optionScore.totalScore === leaderScore,
  ).length;

  return {
    criteriaCount: block.criteria.length,
    optionCount: block.options.length,
    totalWeight: block.criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
    leaderScore,
    hasTie: leaderScore > 0 && winnerCount > 1,
    optionScores: optionScores.map((optionScore) => ({
      ...optionScore,
      progress: leaderScore > 0 ? Math.round((optionScore.totalScore / leaderScore) * 100) : 0,
      isWinner: leaderScore > 0 && optionScore.totalScore === leaderScore,
    })),
  };
}

export function getBusinessModelCanvasSummary(
  block: WorkspaceBusinessModelCanvasBlock,
): WorkspaceBusinessModelCanvasSummary {
  const scoredCells = WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS.map((key) => ({
    key,
    content: trimToEmpty(block.cells[key]),
    signalCount: countCanvasSignals(block.cells[key]),
  }));
  const strongestCells = scoredCells
    .filter((cell) => cell.content)
    .sort((left, right) => right.signalCount - left.signalCount)
    .slice(0, 3)
    .map((cell) => cell.key);
  const missingCells = scoredCells.filter((cell) => !cell.content).map((cell) => cell.key);
  const filledCellCount = scoredCells.length - missingCells.length;

  return {
    filledCellCount,
    missingCellCount: missingCells.length,
    readiness: getCanvasReadiness(filledCellCount),
    strongestCells,
    missingCells,
  };
}

export function analyzeBusinessModelCanvas(
  block: WorkspaceBusinessModelCanvasBlock,
): WorkspaceBusinessModelCanvasAnalysis {
  const summary = getBusinessModelCanvasSummary(block);
  const coveragePercent = Math.round(
    (summary.filledCellCount / WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS.length) * 100,
  );
  const missingLabels = summary.missingCells.map(
    (key) => workspaceBusinessModelCanvasCellLabels[key],
  );
  const strongestLabels = summary.strongestCells.map(
    (key) => workspaceBusinessModelCanvasCellLabels[key],
  );
  const nextMoves: string[] = [];

  if (summary.missingCells.includes("customerSegments")) {
    nextMoves.push(
      "Name the primary customer segment so the rest of the canvas has a clear target.",
    );
  }

  if (summary.missingCells.includes("valuePropositions")) {
    nextMoves.push(
      "Clarify the core promise and the specific outcome each customer segment is buying.",
    );
  }

  if (summary.missingCells.includes("channels")) {
    nextMoves.push(
      "Decide which acquisition and delivery channels will reliably reach the chosen segment.",
    );
  }

  if (summary.missingCells.includes("revenueStreams")) {
    nextMoves.push("Spell out how the model captures value, not just how it creates it.");
  }

  if (summary.missingCells.includes("costStructure")) {
    nextMoves.push("List the biggest cost drivers so the model can be tested for margin health.");
  }

  if (nextMoves.length < 3 && summary.strongestCells.includes("valuePropositions")) {
    nextMoves.push(
      "Pressure-test whether the current value proposition is matched by a repeatable channel and relationship strategy.",
    );
  }

  if (nextMoves.length < 3 && summary.strongestCells.includes("keyActivities")) {
    nextMoves.push(
      "Check that the core activities are supported by the required resources and partners.",
    );
  }

  const narrative = [
    `Canvas coverage is ${summary.filledCellCount}/${WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS.length} cells (${coveragePercent}%), which puts the model in a ${summary.readiness} state.`,
    strongestLabels.length > 0
      ? `The most developed areas right now are ${strongestLabels.join(", ")}.`
      : "No area is detailed enough yet to count as a strategic strength.",
    missingLabels.length > 0
      ? `The main gaps are ${missingLabels.join(", ")}.`
      : "All core areas are represented; focus on tightening the links between them.",
    `Next moves: ${nextMoves.slice(0, 3).join(" ")}`.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...summary,
    coveragePercent,
    narrative,
  };
}

export function resolveStrategicAssumptionLinkLabel(
  node: WorkspaceNode,
  assumption: WorkspaceStrategicAssumption,
) {
  if (assumption.linkType === "none" || !assumption.linkId) {
    return null;
  }

  if (assumption.linkType === "okr") {
    for (const tab of node.tabs) {
      for (const block of tab.blocks) {
        if (block.type !== "okr-tracker") {
          continue;
        }

        const objective = block.objectives.find((entry) => entry.id === assumption.linkId);

        if (objective) {
          return `OKR: ${objective.title.trim() || "Untitled objective"}`;
        }
      }
    }
  }

  if (assumption.linkType === "decision") {
    for (const tab of node.tabs) {
      const block = tab.blocks.find(
        (entry): entry is WorkspaceDecisionMatrixBlock =>
          entry.type === "decision-matrix" && entry.id === assumption.linkId,
      );

      if (block) {
        return `Decision: ${trimToEmpty(block.question) || block.title.trim() || "Untitled decision"}`;
      }
    }
  }

  if (
    assumption.linkType === "bmc" &&
    WORKSPACE_BUSINESS_MODEL_CANVAS_CELL_KEYS.includes(
      assumption.linkId as WorkspaceBusinessModelCanvasCellKey,
    )
  ) {
    return `BMC: ${
      workspaceBusinessModelCanvasCellLabels[
        assumption.linkId as WorkspaceBusinessModelCanvasCellKey
      ]
    }`;
  }

  return null;
}

export function getAssumptionTrackerSummary(
  block: WorkspaceAssumptionTrackerBlock,
): WorkspaceAssumptionTrackerSummary {
  const total = block.assumptions.length;

  return {
    total,
    averageConfidence:
      total > 0
        ? Number(
            (
              block.assumptions.reduce((sum, assumption) => sum + assumption.confidence, 0) / total
            ).toFixed(1),
          )
        : 0,
    validatingCount: block.assumptions.filter((assumption) => assumption.status === "validating")
      .length,
    confirmedCount: block.assumptions.filter((assumption) => assumption.status === "confirmed")
      .length,
    atRiskCount: block.assumptions.filter((assumption) => assumption.status === "at-risk").length,
    falseCount: block.assumptions.filter((assumption) => assumption.status === "false").length,
  };
}

export function summarizeBusinessModelCanvasForPreview(block: WorkspaceBusinessModelCanvasBlock) {
  const summary = getBusinessModelCanvasSummary(block);

  if (summary.filledCellCount === 0) {
    return "Business model canvas has not been filled yet.";
  }

  return truncateText(
    `Canvas coverage is ${summary.filledCellCount}/9. Strongest cells: ${
      summary.strongestCells.map((key) => workspaceBusinessModelCanvasCellLabels[key]).join(", ") ||
      "none yet"
    }.`,
    180,
  );
}
