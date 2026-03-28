import { WORKSPACE_PEOPLE_SKILL_DIMENSIONS } from "./constants";
import { trimToEmpty } from "./shared";
import type {
  WorkspaceDelegationMatrixBlock,
  WorkspaceDelegationMatrixSummary,
  WorkspaceDelegationStatus,
  WorkspacePeopleSkillDimension,
  WorkspaceSeatHealth,
  WorkspaceSeatLoadLevel,
  WorkspaceSeatPlannerBlock,
  WorkspaceSeatPlannerFilter,
  WorkspaceSeatPlannerSeat,
  WorkspaceSeatPlannerSummary,
  WorkspaceSkillsHeatMapBlock,
  WorkspaceSkillsHeatMapScores,
  WorkspaceSkillsHeatMapSummary,
  WorkspaceTalentGridBlock,
  WorkspaceTalentGridBoxKey,
  WorkspaceTalentGridMember,
  WorkspaceTalentGridSummary,
} from "./types";

export const workspacePeopleSkillDimensionLabels: Record<WorkspacePeopleSkillDimension, string> = {
  writing: "Writing",
  strategy: "Strategy",
  design: "Design",
  analytics: "Analytics",
  leadership: "Leadership",
};

export const workspaceDelegationStatusLabels: Record<WorkspaceDelegationStatus, string> = {
  stuck: "Stuck",
  transitioning: "Transitioning",
  delegated: "Delegated",
};

export const workspaceSeatHealthLabels: Record<WorkspaceSeatHealth, string> = {
  strong: "Strong",
  fragile: "Fragile",
  gap: "Gap",
};

export const workspaceSeatLoadLevelLabels: Record<WorkspaceSeatLoadLevel, string> = {
  underloaded: "Underloaded",
  balanced: "Balanced",
  overloaded: "Overloaded",
};

export const workspaceSeatPlannerFilterLabels: Record<WorkspaceSeatPlannerFilter, string> = {
  all: "All",
  fragile: "Fragile",
  overloaded: "Overloaded",
  uncovered: "Uncovered",
};

export const workspaceTalentGridBoxLabels: Record<WorkspaceTalentGridBoxKey, string> = {
  risk: "Risk",
  "average-joe": "Average Joe",
  specialist: "Specialist",
  "under-performer": "Under-performer",
  "core-player": "Core Player",
  "high-performer": "High Performer",
  enigma: "Enigma",
  "growth-star": "Growth Star",
  superstar: "Superstar",
};

export function createWorkspaceSkillsScoreMap(
  partial: Partial<WorkspaceSkillsHeatMapScores> = {},
): WorkspaceSkillsHeatMapScores {
  return {
    writing: clampSkillScore(partial.writing),
    strategy: clampSkillScore(partial.strategy),
    design: clampSkillScore(partial.design),
    analytics: clampSkillScore(partial.analytics),
    leadership: clampSkillScore(partial.leadership),
  };
}

export function clampSkillScore(value: number | null | undefined, fallback = 5) {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

export function clampTalentGridScore(value: number | null | undefined, fallback = 3) {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function getSkillsHeatMapMemberAverage(scores: WorkspaceSkillsHeatMapScores) {
  const total = WORKSPACE_PEOPLE_SKILL_DIMENSIONS.reduce(
    (sum, dimension) => sum + scores[dimension],
    0,
  );
  return Number((total / WORKSPACE_PEOPLE_SKILL_DIMENSIONS.length).toFixed(1));
}

export function getSkillsHeatMapSummary(
  block: WorkspaceSkillsHeatMapBlock,
): WorkspaceSkillsHeatMapSummary {
  const averageByDimension = Object.fromEntries(
    WORKSPACE_PEOPLE_SKILL_DIMENSIONS.map((dimension) => {
      const total = block.members.reduce((sum, member) => sum + member.scores[dimension], 0);
      const average =
        block.members.length > 0 ? Number((total / block.members.length).toFixed(1)) : 0;
      return [dimension, average];
    }),
  ) as Record<WorkspacePeopleSkillDimension, number>;
  const rankedDimensions = [...WORKSPACE_PEOPLE_SKILL_DIMENSIONS].sort(
    (left, right) => averageByDimension[right] - averageByDimension[left],
  );
  const overallAverage =
    block.members.length > 0
      ? Number(
          (
            block.members.reduce(
              (sum, member) => sum + getSkillsHeatMapMemberAverage(member.scores),
              0,
            ) / block.members.length
          ).toFixed(1),
        )
      : 0;

  return {
    memberCount: block.members.length,
    overallAverage,
    criticalGapCount: block.members.reduce(
      (sum, member) =>
        sum +
        WORKSPACE_PEOPLE_SKILL_DIMENSIONS.filter((dimension) => member.scores[dimension] <= 3)
          .length,
      0,
    ),
    strongestDimension: rankedDimensions[0] ?? null,
    weakestDimension: rankedDimensions[rankedDimensions.length - 1] ?? null,
    averageByDimension,
  };
}

export function getDelegationMatrixSummary(
  block: WorkspaceDelegationMatrixBlock,
): WorkspaceDelegationMatrixSummary {
  const totalHoursPerWeek = roundOneDecimal(
    block.items.reduce((sum, item) => sum + item.hoursPerWeek, 0),
  );
  const pendingHoursPerWeek = roundOneDecimal(
    block.items
      .filter((item) => item.status !== "delegated")
      .reduce((sum, item) => sum + item.hoursPerWeek, 0),
  );
  const delegatedHoursPerWeek = roundOneDecimal(totalHoursPerWeek - pendingHoursPerWeek);

  return {
    itemCount: block.items.length,
    totalHoursPerWeek,
    pendingHoursPerWeek,
    delegatedHoursPerWeek,
    totalRecoverableValue: roundOneDecimal(totalHoursPerWeek * block.hourlyRate),
    pendingRecoverableValue: roundOneDecimal(pendingHoursPerWeek * block.hourlyRate),
    stuckCount: block.items.filter((item) => item.status === "stuck").length,
    transitioningCount: block.items.filter((item) => item.status === "transitioning").length,
    delegatedCount: block.items.filter((item) => item.status === "delegated").length,
  };
}

export function getTalentGridBoxKey(
  performance: number,
  potential: number,
): WorkspaceTalentGridBoxKey {
  const performanceTier = getTalentGridTier(performance);
  const potentialTier = getTalentGridTier(potential);

  if (potentialTier === "high") {
    if (performanceTier === "high") {
      return "superstar";
    }

    if (performanceTier === "medium") {
      return "growth-star";
    }

    return "enigma";
  }

  if (potentialTier === "medium") {
    if (performanceTier === "high") {
      return "high-performer";
    }

    if (performanceTier === "medium") {
      return "core-player";
    }

    return "under-performer";
  }

  if (performanceTier === "high") {
    return "specialist";
  }

  if (performanceTier === "medium") {
    return "average-joe";
  }

  return "risk";
}

export function getTalentGridSummary(block: WorkspaceTalentGridBlock): WorkspaceTalentGridSummary {
  const boxCounts = createTalentGridBoxCountRecord();

  for (const member of block.members) {
    const key = getTalentGridBoxKey(member.performance, member.potential);
    boxCounts[key] += 1;
  }

  return {
    memberCount: block.members.length,
    superstarCount: boxCounts.superstar,
    growthStarCount: boxCounts["growth-star"],
    corePlayerCount: boxCounts["core-player"],
    riskCount: boxCounts.risk,
    boxCounts,
  };
}

export function getSeatPlannerSummary(
  block: WorkspaceSeatPlannerBlock,
): WorkspaceSeatPlannerSummary {
  return {
    seatCount: block.seats.length,
    filledSeats: block.seats.filter((seat) => trimToEmpty(seat.owner)).length,
    fragileSeats: block.seats.filter((seat) => seat.health === "fragile").length,
    overloadedSeats: block.seats.filter((seat) => seat.load === "overloaded").length,
    uncoveredSeats: block.seats.filter((seat) => isSeatUncovered(seat)).length,
  };
}

export function isSeatUncovered(seat: WorkspaceSeatPlannerSeat) {
  return (
    seat.health === "gap" ||
    trimToEmpty(seat.owner).length === 0 ||
    trimToEmpty(seat.backupOwner).length === 0
  );
}

export function matchesSeatPlannerFilter(
  seat: WorkspaceSeatPlannerSeat,
  filter: WorkspaceSeatPlannerFilter,
) {
  switch (filter) {
    case "fragile":
      return seat.health === "fragile";
    case "overloaded":
      return seat.load === "overloaded";
    case "uncovered":
      return isSeatUncovered(seat);
    default:
      return true;
  }
}

export function getTalentGridDisplayName(member: WorkspaceTalentGridMember) {
  const name = trimToEmpty(member.name);
  return name || "Unnamed";
}

function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function createTalentGridBoxCountRecord(): Record<WorkspaceTalentGridBoxKey, number> {
  return {
    risk: 0,
    "average-joe": 0,
    specialist: 0,
    "under-performer": 0,
    "core-player": 0,
    "high-performer": 0,
    enigma: 0,
    "growth-star": 0,
    superstar: 0,
  };
}

function getTalentGridTier(value: number) {
  if (value >= 4) {
    return "high";
  }

  if (value <= 2) {
    return "low";
  }

  return "medium";
}
