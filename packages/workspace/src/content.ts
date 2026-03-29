import {
  WORKSPACE_CONTENT_PIPELINE_STATUSES,
  WORKSPACE_CONTENT_PLATFORMS,
  WORKSPACE_CONTENT_QUALITY_DIMENSIONS,
} from "./constants";
import type {
  WorkspaceContentPipelineBlock,
  WorkspaceContentPipelineStatus,
  WorkspaceContentPlatform,
  WorkspaceContentQualityDimension,
  WorkspaceContentQualityRadarBlock,
  WorkspaceContentQualityScores,
  WorkspaceContentRoiItem,
  WorkspaceContentRoiSort,
  WorkspaceContentRoiStatus,
  WorkspaceContentRoiTrackerBlock,
  WorkspaceContentRoiTrackerSummary,
  WorkspaceContentQualityRadarSummary,
  WorkspaceContentPipelineSummary,
} from "./types";

export const workspaceContentPlatformLabels: Record<WorkspaceContentPlatform, string> = {
  instagram: "IG",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YT",
};

export const workspaceContentPipelineStatusLabels: Record<WorkspaceContentPipelineStatus, string> =
  {
    ideas: "Ideas",
    draft: "Draft",
    review: "Review",
    approved: "Approved",
    published: "Published",
  };

export const workspaceContentQualityDimensionLabels: Record<
  WorkspaceContentQualityDimension,
  string
> = {
  hook: "Hook",
  value: "Value",
  emotion: "Emotion",
  cta: "CTA",
  platformFit: "Platform Fit",
  brand: "Brand",
  shareability: "Shareability",
  scrollStop: "Scroll-Stop",
  authenticity: "Authenticity",
  storytelling: "Storytelling",
};

export const workspaceContentRoiSortLabels: Record<WorkspaceContentRoiSort, string> = {
  roi: "ROI",
  reach: "Reach",
  leads: "Leads",
};

export const workspaceContentRoiStatusLabels: Record<WorkspaceContentRoiStatus, string> = {
  "high-return": "High Return",
  promising: "Promising",
  "low-return": "Low Return",
};

export function clampContentTenPointScore(value: number | null | undefined, fallback = 5) {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

export function createWorkspaceContentQualityScoreMap(
  partial: Partial<WorkspaceContentQualityScores> = {},
): WorkspaceContentQualityScores {
  return {
    hook: clampContentTenPointScore(partial.hook),
    value: clampContentTenPointScore(partial.value),
    emotion: clampContentTenPointScore(partial.emotion),
    cta: clampContentTenPointScore(partial.cta),
    platformFit: clampContentTenPointScore(partial.platformFit),
    brand: clampContentTenPointScore(partial.brand),
    shareability: clampContentTenPointScore(partial.shareability),
    scrollStop: clampContentTenPointScore(partial.scrollStop),
    authenticity: clampContentTenPointScore(partial.authenticity),
    storytelling: clampContentTenPointScore(partial.storytelling),
  };
}

export function getContentPipelineSummary(
  block: WorkspaceContentPipelineBlock,
): WorkspaceContentPipelineSummary {
  const statusCounts = Object.fromEntries(
    WORKSPACE_CONTENT_PIPELINE_STATUSES.map((status) => [status, 0]),
  ) as Record<WorkspaceContentPipelineStatus, number>;
  const platformCounts = Object.fromEntries(
    WORKSPACE_CONTENT_PLATFORMS.map((platform) => [platform, 0]),
  ) as Record<WorkspaceContentPlatform, number>;

  for (const item of block.items) {
    statusCounts[item.status] += 1;
    platformCounts[item.platform] += 1;
  }

  const topPlatform = rankCountRecord(platformCounts)[0]?.key ?? null;
  const bottleneckStatus =
    rankCountRecord(
      Object.fromEntries(
        Object.entries(statusCounts).filter(([status]) => status !== "published"),
      ) as Record<Exclude<WorkspaceContentPipelineStatus, "published">, number>,
    )[0]?.key ?? null;

  return {
    totalItems: block.items.length,
    publishedCount: statusCounts.published,
    reviewCount: statusCounts.review,
    topPlatform,
    bottleneckStatus,
    statusCounts,
  };
}

export function getContentQualityRadarAverage(scores: WorkspaceContentQualityScores) {
  const total = WORKSPACE_CONTENT_QUALITY_DIMENSIONS.reduce(
    (sum, dimension) => sum + scores[dimension],
    0,
  );
  return Number((total / WORKSPACE_CONTENT_QUALITY_DIMENSIONS.length).toFixed(1));
}

export function getContentQualityRadarSummary(
  block: WorkspaceContentQualityRadarBlock,
): WorkspaceContentQualityRadarSummary {
  const ranked = [...WORKSPACE_CONTENT_QUALITY_DIMENSIONS].sort(
    (left, right) => block.scores[right] - block.scores[left],
  );

  return {
    averageScore: getContentQualityRadarAverage(block.scores),
    strongestDimension: ranked[0] ?? null,
    weakestDimension: ranked[ranked.length - 1] ?? null,
  };
}

export function getContentRoiInfluencedLeads(item: WorkspaceContentRoiItem) {
  return Math.round(item.leads * (item.conversionInfluence / 10));
}

export function getContentRoiScore(item: WorkspaceContentRoiItem) {
  const leadVolumeScore = Math.min(35, item.leads * 6);
  const leadRatePerThousand = item.reach > 0 ? (item.leads / item.reach) * 1000 : 0;
  const leadEfficiencyScore = Math.min(20, leadRatePerThousand * 8);
  const influenceScore = item.conversionInfluence * 2.5;
  const repurposeScore = item.repurposeValue * 2;

  return Math.round(
    Math.min(100, leadVolumeScore + leadEfficiencyScore + influenceScore + repurposeScore),
  );
}

export function getContentRoiStatus(score: number): WorkspaceContentRoiStatus {
  if (score >= 75) {
    return "high-return";
  }

  if (score >= 45) {
    return "promising";
  }

  return "low-return";
}

export function sortContentRoiItems(
  items: WorkspaceContentRoiItem[],
  sortBy: WorkspaceContentRoiSort,
) {
  return [...items].sort((left, right) => {
    if (sortBy === "reach") {
      if (right.reach !== left.reach) {
        return right.reach - left.reach;
      }
    } else if (sortBy === "leads") {
      if (right.leads !== left.leads) {
        return right.leads - left.leads;
      }
    } else {
      const rightScore = getContentRoiScore(right);
      const leftScore = getContentRoiScore(left);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
    }

    const rightScore = getContentRoiScore(right);
    const leftScore = getContentRoiScore(left);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    if (right.leads !== left.leads) {
      return right.leads - left.leads;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getContentRoiTrackerSummary(
  block: WorkspaceContentRoiTrackerBlock,
): WorkspaceContentRoiTrackerSummary {
  const scoredItems = block.items.map((item) => {
    const score = getContentRoiScore(item);

    return {
      item,
      score,
      influencedLeads: getContentRoiInfluencedLeads(item),
      status: getContentRoiStatus(score),
    };
  });
  const platformScores = aggregateContentRoiScores(scoredItems, (entry) => entry.item.platform);
  const campaignScores = aggregateContentRoiScores(
    scoredItems.filter((entry) => entry.item.campaign.trim().length > 0),
    (entry) => entry.item.campaign.trim(),
  );

  return {
    itemCount: block.items.length,
    totalReach: block.items.reduce((sum, item) => sum + item.reach, 0),
    totalLeads: block.items.reduce((sum, item) => sum + item.leads, 0),
    totalInfluencedLeads: scoredItems.reduce((sum, entry) => sum + entry.influencedLeads, 0),
    averageScore:
      scoredItems.length > 0
        ? Number(
            (scoredItems.reduce((sum, entry) => sum + entry.score, 0) / scoredItems.length).toFixed(
              1,
            ),
          )
        : 0,
    topPlatform: platformScores[0]?.key ?? null,
    topCampaign: campaignScores[0]?.key ?? null,
    highReturnCount: scoredItems.filter((entry) => entry.status === "high-return").length,
    promisingCount: scoredItems.filter((entry) => entry.status === "promising").length,
    lowReturnCount: scoredItems.filter((entry) => entry.status === "low-return").length,
  };
}

function aggregateContentRoiScores<TKey extends string>(
  entries: Array<{
    item: WorkspaceContentRoiItem;
    score: number;
    influencedLeads: number;
  }>,
  getKey: (entry: {
    item: WorkspaceContentRoiItem;
    score: number;
    influencedLeads: number;
  }) => TKey,
) {
  const record = new Map<
    TKey,
    {
      totalScore: number;
      itemCount: number;
      totalLeads: number;
    }
  >();

  for (const entry of entries) {
    const key = getKey(entry);
    const current = record.get(key) ?? { totalScore: 0, itemCount: 0, totalLeads: 0 };

    current.totalScore += entry.score;
    current.itemCount += 1;
    current.totalLeads += entry.item.leads;
    record.set(key, current);
  }

  return [...record.entries()]
    .map(([key, value]) => ({
      key,
      averageScore: value.totalScore / value.itemCount,
      totalLeads: value.totalLeads,
    }))
    .sort((left, right) => {
      if (right.averageScore !== left.averageScore) {
        return right.averageScore - left.averageScore;
      }

      if (right.totalLeads !== left.totalLeads) {
        return right.totalLeads - left.totalLeads;
      }

      return String(left.key).localeCompare(String(right.key));
    });
}

function rankCountRecord<TKey extends string>(record: Record<TKey, number>) {
  return (Object.keys(record) as TKey[])
    .map((key) => ({ key, count: record[key] }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return String(left.key).localeCompare(String(right.key));
    });
}
