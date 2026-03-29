import { WORKSPACE_SALES_FORECAST_BUCKETS, WORKSPACE_SALES_PIPELINE_STAGES } from "./constants";
import type {
  WorkspaceDealScoreTone,
  WorkspaceDealScoringDeal,
  WorkspaceDealScoringMatrixBlock,
  WorkspaceDealScoringMatrixSummary,
  WorkspaceForecastConfidenceBoardBlock,
  WorkspaceForecastConfidenceBoardSummary,
  WorkspaceForecastConfidenceBucketSummary,
  WorkspaceForecastConfidenceItem,
  WorkspacePipelineFunnelBlock,
  WorkspacePipelineFunnelStageSummary,
  WorkspacePipelineFunnelSummary,
  WorkspaceSalesForecastBucket,
  WorkspaceSalesPipelineStage,
  WorkspaceSalesTemperature,
} from "./types";

export const workspaceSalesPipelineStageLabels: Record<WorkspaceSalesPipelineStage, string> = {
  lead: "Lead",
  consultation: "Consultation",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed: "Closed",
};

export const workspaceSalesPipelineStageCompactLabels: Record<WorkspaceSalesPipelineStage, string> =
  {
    lead: "Lead",
    consultation: "Consult",
    proposal: "Proposal",
    negotiation: "Negotiate",
    closed: "Closed",
  };

export const workspaceSalesTemperatureLabels: Record<WorkspaceSalesTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export const workspaceSalesForecastBucketLabels: Record<WorkspaceSalesForecastBucket, string> = {
  commit: "Commit",
  likely: "Likely",
  upside: "Upside",
  "at-risk": "At Risk",
};

export const workspaceSalesPipelineStageWidths: Record<WorkspaceSalesPipelineStage, number> = {
  lead: 100,
  consultation: 84,
  proposal: 68,
  negotiation: 52,
  closed: 36,
};

export function getSalesPipelineStageIndex(stage: WorkspaceSalesPipelineStage) {
  return WORKSPACE_SALES_PIPELINE_STAGES.indexOf(stage);
}

export function getDealScoreTone(score: number): WorkspaceDealScoreTone {
  if (score >= 75) {
    return "strong";
  }

  if (score >= 50) {
    return "medium";
  }

  return "weak";
}

export function sortDealScoringDeals(deals: WorkspaceDealScoringDeal[]) {
  return [...deals].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.valueEgp !== left.valueEgp) {
      return right.valueEgp - left.valueEgp;
    }

    return left.clientName.localeCompare(right.clientName);
  });
}

export function getDealScoringMatrixSummary(
  block: WorkspaceDealScoringMatrixBlock,
): WorkspaceDealScoringMatrixSummary {
  const stageCounts = createStageCountRecord();

  for (const deal of block.deals) {
    stageCounts[deal.stage] += 1;
  }

  const totalValue = block.deals.reduce((sum, deal) => sum + deal.valueEgp, 0);
  const averageScore =
    block.deals.length > 0
      ? Math.round(block.deals.reduce((sum, deal) => sum + deal.score, 0) / block.deals.length)
      : 0;

  return {
    dealCount: block.deals.length,
    totalValue,
    averageScore,
    hotCount: block.deals.filter((deal) => deal.temperature === "hot").length,
    warmCount: block.deals.filter((deal) => deal.temperature === "warm").length,
    coldCount: block.deals.filter((deal) => deal.temperature === "cold").length,
    stageCounts,
  };
}

export function getPipelineFunnelSummary(
  block: WorkspacePipelineFunnelBlock,
): WorkspacePipelineFunnelSummary {
  const totalValue = block.deals.reduce((sum, deal) => sum + deal.valueEgp, 0);
  const closedValue = block.deals
    .filter((deal) => deal.stage === "closed")
    .reduce((sum, deal) => sum + deal.valueEgp, 0);

  return {
    dealCount: block.deals.length,
    totalValue,
    closedValue,
    openValue: totalValue - closedValue,
    stageSummaries: WORKSPACE_SALES_PIPELINE_STAGES.map((stage) =>
      createPipelineStageSummary(stage, block.deals),
    ),
  };
}

export function getForecastDealWeightedValue(deal: WorkspaceForecastConfidenceItem) {
  return roundOneDecimal((deal.valueEgp * deal.confidence) / 100);
}

export function getForecastConfidenceBoardSummary(
  block: WorkspaceForecastConfidenceBoardBlock,
): WorkspaceForecastConfidenceBoardSummary {
  const bucketSummaries = WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) =>
    createForecastBucketSummary(bucket, block.deals),
  );
  const commitRevenue =
    bucketSummaries.find((summary) => summary.bucket === "commit")?.totalValue ?? 0;
  const weightedForecast = roundOneDecimal(
    bucketSummaries.reduce((sum, summary) => sum + summary.weightedValue, 0),
  );
  const atRiskValue =
    bucketSummaries.find((summary) => summary.bucket === "at-risk")?.totalValue ?? 0;

  return {
    dealCount: block.deals.length,
    targetRevenueEgp: block.targetRevenueEgp,
    commitRevenue,
    weightedForecast,
    atRiskValue,
    coveragePercent:
      block.targetRevenueEgp > 0
        ? Math.round((weightedForecast / block.targetRevenueEgp) * 100)
        : 0,
    averageConfidence:
      block.deals.length > 0
        ? Math.round(
            block.deals.reduce((sum, deal) => sum + deal.confidence, 0) / block.deals.length,
          )
        : 0,
    bucketSummaries,
  };
}

function createStageCountRecord(): Record<WorkspaceSalesPipelineStage, number> {
  return {
    lead: 0,
    consultation: 0,
    proposal: 0,
    negotiation: 0,
    closed: 0,
  };
}

function createPipelineStageSummary(
  stage: WorkspaceSalesPipelineStage,
  deals: WorkspacePipelineFunnelBlock["deals"],
): WorkspacePipelineFunnelStageSummary {
  const stageDeals = deals.filter((deal) => deal.stage === stage);

  return {
    stage,
    label: workspaceSalesPipelineStageLabels[stage],
    widthPercent: workspaceSalesPipelineStageWidths[stage],
    dealCount: stageDeals.length,
    totalValue: stageDeals.reduce((sum, deal) => sum + deal.valueEgp, 0),
  };
}

function createForecastBucketSummary(
  bucket: WorkspaceSalesForecastBucket,
  deals: WorkspaceForecastConfidenceBoardBlock["deals"],
): WorkspaceForecastConfidenceBucketSummary {
  const bucketDeals = deals.filter((deal) => deal.bucket === bucket);

  return {
    bucket,
    label: workspaceSalesForecastBucketLabels[bucket],
    dealCount: bucketDeals.length,
    totalValue: bucketDeals.reduce((sum, deal) => sum + deal.valueEgp, 0),
    weightedValue: roundOneDecimal(
      bucketDeals.reduce((sum, deal) => sum + getForecastDealWeightedValue(deal), 0),
    ),
  };
}

function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}
