import { WORKSPACE_AUTHORITY_SCORECARD_METRICS } from "./constants";
import { trimToEmpty } from "./shared";
import type {
  WorkspaceAuthorityScoreMetricKey,
  WorkspaceAuthorityScorecardBlock,
  WorkspaceAuthorityScorecardMetricSummary,
  WorkspaceAuthorityScorecardSummary,
  WorkspaceHookBankBlock,
  WorkspaceHookBankItem,
  WorkspaceHookBankSummary,
  WorkspaceMessageHouseBlock,
  WorkspaceMessageHouseSummary,
} from "./types";

export const workspaceAuthorityScoreMetricLabels: Record<WorkspaceAuthorityScoreMetricKey, string> =
  {
    posts: "Posts / Month",
    videos: "Videos / Month",
    speakingGigs: "Speaking Gigs",
    podcastAppearances: "Podcast Appearances",
    mediaFeatures: "Media Features",
    followers: "Followers",
  };

export const workspaceAuthorityScoreMetricIcons: Record<WorkspaceAuthorityScoreMetricKey, string> =
  {
    posts: "i-lucide-pen-square",
    videos: "i-lucide-video",
    speakingGigs: "i-lucide-mic-2",
    podcastAppearances: "i-lucide-headphones",
    mediaFeatures: "i-lucide-newspaper",
    followers: "i-lucide-users",
  };

export function getAuthorityScoreMetricProgress(value: number, target: number) {
  if (target <= 0) {
    return value > 0 ? 100 : 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

export function getAuthorityScorecardSummary(
  block: WorkspaceAuthorityScorecardBlock,
): WorkspaceAuthorityScorecardSummary {
  const metrics = Object.fromEntries(
    WORKSPACE_AUTHORITY_SCORECARD_METRICS.map((key) => {
      const entry = block.metrics[key];
      const summary = {
        key,
        value: entry.value,
        target: entry.target,
        progress: getAuthorityScoreMetricProgress(entry.value, entry.target),
      } satisfies WorkspaceAuthorityScorecardMetricSummary;

      return [key, summary];
    }),
  ) as Record<WorkspaceAuthorityScoreMetricKey, WorkspaceAuthorityScorecardMetricSummary>;
  const ranked = [...WORKSPACE_AUTHORITY_SCORECARD_METRICS].sort(
    (left, right) => metrics[right].progress - metrics[left].progress,
  );
  const averageProgress =
    WORKSPACE_AUTHORITY_SCORECARD_METRICS.length > 0
      ? Math.round(
          WORKSPACE_AUTHORITY_SCORECARD_METRICS.reduce(
            (sum, key) => sum + metrics[key].progress,
            0,
          ) / WORKSPACE_AUTHORITY_SCORECARD_METRICS.length,
        )
      : 0;

  return {
    metricCount: WORKSPACE_AUTHORITY_SCORECARD_METRICS.length,
    atTargetCount: WORKSPACE_AUTHORITY_SCORECARD_METRICS.filter(
      (key) => metrics[key].value >= metrics[key].target,
    ).length,
    averageProgress,
    strongestMetric: ranked[0] ?? null,
    weakestMetric: ranked[ranked.length - 1] ?? null,
    metrics,
  };
}

export function sortHookBankItems(items: WorkspaceHookBankItem[]) {
  return [...items].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const categoryCompare = left.category.localeCompare(right.category);

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return left.text.localeCompare(right.text);
  });
}

export function getHookBankSummary(block: WorkspaceHookBankBlock): WorkspaceHookBankSummary {
  if (block.hooks.length === 0) {
    return {
      hookCount: 0,
      averageScore: 0,
      topCategory: null,
      topScore: 0,
    };
  }

  const categoryScores = new Map<string, { total: number; count: number }>();

  for (const hook of block.hooks) {
    const category = trimToEmpty(hook.category) || "uncategorized";
    const entry = categoryScores.get(category) ?? {
      total: 0,
      count: 0,
    };
    entry.total += hook.score;
    entry.count += 1;
    categoryScores.set(category, entry);
  }

  const topCategory =
    [...categoryScores.entries()].sort((left, right) => {
      const rightAverage = right[1].total / right[1].count;
      const leftAverage = left[1].total / left[1].count;

      if (rightAverage !== leftAverage) {
        return rightAverage - leftAverage;
      }

      return right[1].count - left[1].count;
    })[0]?.[0] ?? null;

  return {
    hookCount: block.hooks.length,
    averageScore: Number(
      (block.hooks.reduce((sum, hook) => sum + hook.score, 0) / block.hooks.length).toFixed(1),
    ),
    topCategory,
    topScore: Math.max(...block.hooks.map((hook) => hook.score)),
  };
}

export function getMessageHouseSummary(
  block: WorkspaceMessageHouseBlock,
): WorkspaceMessageHouseSummary {
  const filledSectionCount = [
    trimToEmpty(block.brandPromise),
    ...block.pillars.map((pillar) => trimToEmpty(pillar.body)),
    trimToEmpty(block.audiencePains),
    trimToEmpty(block.proofPoints),
    trimToEmpty(block.voicePrinciples),
  ].filter(Boolean).length;

  return {
    filledSectionCount,
    emptySectionCount: 7 - filledSectionCount,
    pillarCount: block.pillars.length,
    latestStressTestAvailable: trimToEmpty(block.latestStressTest).length > 0,
  };
}

export function buildHookBankGenerationPrompt(block: WorkspaceHookBankBlock) {
  const existingHooks = sortHookBankItems(block.hooks)
    .slice(0, 12)
    .map(
      (hook) =>
        `- [${trimToEmpty(hook.category) || "uncategorized"}] (${hook.score}/10) ${trimToEmpty(hook.text)}`,
    )
    .join("\n");

  return [
    "Act as Orch's Brand agent.",
    "Generate 5 sharp content hooks for Ahmed's personal brand.",
    "Keep them practical, specific, and suitable for a marketing operator/founder audience.",
    "Vary the angle across categories such as pattern-interrupt, investment, mistake, insider, contrarian, or proof.",
    "Avoid repeating the existing hooks.",
    "Return ONLY valid JSON with this exact shape:",
    '{"hooks":[{"category":"pattern-interrupt","text":"Hook copy","score":8}]}',
    "Rules:",
    "- `category` must be 1-3 lowercase words, hyphenated if needed.",
    "- `text` must be 1 sentence and 140 characters or less.",
    "- `score` must be an integer from 1 to 10.",
    existingHooks ? `Existing hooks:\n${existingHooks}` : "No existing hooks yet.",
  ].join("\n\n");
}

export function buildMessageHouseStressTestPrompt(block: WorkspaceMessageHouseBlock) {
  const pillarLines = block.pillars
    .map(
      (pillar, index) =>
        `Pillar ${index + 1} (${trimToEmpty(pillar.title) || `Pillar ${index + 1}`}): ${trimToEmpty(pillar.body) || "Missing"}`,
    )
    .join("\n");

  return [
    "Act as Orch's Brand agent.",
    "Stress-test this message house for gaps, contradictions, weak proof, and fuzzy positioning.",
    "Respond in concise markdown with these sections only:",
    "1. Gaps",
    "2. Contradictions",
    "3. Weak Proof",
    "4. Tighten Next",
    "Keep it sharp and execution-oriented.",
    `Brand Promise: ${trimToEmpty(block.brandPromise) || "Missing"}`,
    pillarLines,
    `Audience Pains: ${trimToEmpty(block.audiencePains) || "Missing"}`,
    `Proof Points: ${trimToEmpty(block.proofPoints) || "Missing"}`,
    `Voice Principles: ${trimToEmpty(block.voicePrinciples) || "Missing"}`,
  ].join("\n\n");
}
