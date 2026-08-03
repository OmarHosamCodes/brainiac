import { DEFAULT_AGENT_MODEL } from "./types";
import type {
  AgentModelPreset,
  AgentModelTier,
  AgentSurface,
  DashboardAgentToolPreset,
} from "./types";

/** Minimal catalog shape used by the router (matches OpenRouterCatalogModel). */
export type RoutableCatalogModel = {
  id: string;
  name: string;
  contextLength: number | null;
  supportsTools: boolean;
  isFree: boolean;
  pricing: {
    prompt: string;
    completion: string;
  };
};

export type ModelPromptSignals = {
  contentLength: number;
  scopeCount: number;
  mentionCount: number;
  toolPreset: DashboardAgentToolPreset;
  /** Agency Ask still needs tools — time/report answers cannot be invented from canvas context. */
  surface?: AgentSurface;
};

export type ResolveModelForTurnInput = {
  models: RoutableCatalogModel[];
  defaultModel: string;
  preset: AgentModelPreset;
  pinnedModelId?: string | null;
  signals: ModelPromptSignals;
};

export type ResolveModelForTurnResult = {
  model: RoutableCatalogModel | null;
  modelId: string;
  pinnedCleared: boolean;
  reason: "pin" | "sticky" | "auto" | "fallback";
};

type ModelScores = {
  speed: number;
  quality: number;
  costEfficiency: number;
  pricePerMillion: number;
};

const TIER_SEEDS: Record<AgentModelTier, string[]> = {
  fast: [
    "openai/gpt-5-nano",
    "openai/gpt-4.1-nano",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash-001",
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-haiku-4.5",
  ],
  balanced: [
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-sonnet-4.5",
    "google/gemini-2.5-pro",
  ],
  pro: [
    "anthropic/claude-opus-4",
    "anthropic/claude-opus-4.1",
    "openai/o3",
    "openai/o1",
    "openai/gpt-5",
  ],
};

const FAST_HINTS = /\b(nano|mini|flash|haiku|small|lite|turbo|instant)\b/i;
const PRO_HINTS = /\b(opus|o1|o3|pro|reasoning|ultra|large|max|premier)\b/i;
const COMPLEXITY_HINTS =
  /\b(refactor|architect|debug|plan|migrate|design|analyze|review|implement|rewrite)\b/i;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pricePerMillion(model: RoutableCatalogModel) {
  const prompt = Number(model.pricing.prompt) * 1_000_000;
  const completion = Number(model.pricing.completion) * 1_000_000;
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, prompt) + Math.max(0, completion);
}

export function scoreCatalogModel(model: RoutableCatalogModel): ModelScores {
  const haystack = `${model.id} ${model.name}`;
  const price = pricePerMillion(model);
  const contextScore = clamp01((model.contextLength ?? 8_000) / 200_000);

  let speed = clamp01(1 - Math.log10(price + 1) / 3);
  let quality = clamp01(Math.log10(price + 1) / 3 + contextScore * 0.25);

  if (FAST_HINTS.test(haystack)) {
    speed = clamp01(speed + 0.25);
    quality = clamp01(quality - 0.1);
  }
  if (PRO_HINTS.test(haystack)) {
    quality = clamp01(quality + 0.3);
    speed = clamp01(speed - 0.15);
  }
  if (model.supportsTools) {
    quality = clamp01(quality + 0.05);
  }

  return {
    speed,
    quality,
    costEfficiency: speed,
    pricePerMillion: price,
  };
}

export function classifyModelTier(model: RoutableCatalogModel): AgentModelTier {
  for (const tier of ["fast", "balanced", "pro"] as const) {
    if (TIER_SEEDS[tier].includes(model.id)) {
      return tier;
    }
  }

  const scores = scoreCatalogModel(model);
  const haystack = `${model.id} ${model.name}`;

  if (PRO_HINTS.test(haystack) || scores.quality >= 0.72) {
    return "pro";
  }
  if (FAST_HINTS.test(haystack) || scores.speed >= 0.7 || scores.pricePerMillion <= 1) {
    return "fast";
  }
  return "balanced";
}

export function scorePromptComplexity(signals: ModelPromptSignals, content = "") {
  const lengthScore = clamp01(signals.contentLength / 2_400);
  const scopeScore = clamp01(signals.scopeCount / 6);
  const mentionScore = clamp01(signals.mentionCount / 4);
  const modeScore =
    signals.toolPreset === "agent" ? 0.35 : signals.toolPreset === "plan" ? 0.2 : 0.1;
  // ponytail: keyword heuristic ceiling — upgrade to embedding classifier if misroutes pile up
  const keywordBoost = COMPLEXITY_HINTS.test(content) ? 0.2 : 0;

  return clamp01(
    lengthScore * 0.35 + scopeScore * 0.2 + mentionScore * 0.15 + modeScore + keywordBoost,
  );
}

function tierWeights(tier: AgentModelTier) {
  switch (tier) {
    case "fast":
      return { qualityGap: 0.35, latency: 0.45, cost: 0.2 };
    case "pro":
      return { qualityGap: 0.65, latency: 0.15, cost: 0.2 };
    case "balanced":
      return { qualityGap: 0.5, latency: 0.25, cost: 0.25 };
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

function isEligible(model: RoutableCatalogModel, args: { free: boolean; requireTools: boolean }) {
  if (args.free && !model.isFree) {
    return false;
  }
  if (args.requireTools && !model.supportsTools) {
    return false;
  }
  return true;
}

function poolForTier(
  models: RoutableCatalogModel[],
  tier: AgentModelTier,
  args: { free: boolean; requireTools: boolean },
) {
  const seeded = new Set(TIER_SEEDS[tier]);
  return models.filter((model) => {
    if (!isEligible(model, args)) {
      return false;
    }
    return seeded.has(model.id) || classifyModelTier(model) === tier;
  });
}

function fitCost(scores: ModelScores, complexity: number, tier: AgentModelTier, free: boolean) {
  const weights = tierWeights(tier);
  const latencyProxy = 1 - scores.speed;
  const costPenalty = free ? 0 : clamp01(Math.log10(scores.pricePerMillion + 1) / 3);
  return (
    weights.qualityGap * Math.abs(scores.quality - complexity) +
    weights.latency * latencyProxy +
    weights.cost * costPenalty
  );
}

function pickBest(
  pool: RoutableCatalogModel[],
  args: { complexity: number; tier: AgentModelTier; free: boolean },
) {
  if (pool.length === 0) {
    return null;
  }

  const seedRank = new Map(TIER_SEEDS[args.tier].map((id, index) => [id, index]));

  return [...pool].sort((left, right) => {
    const leftScores = scoreCatalogModel(left);
    const rightScores = scoreCatalogModel(right);
    const leftFit = fitCost(leftScores, args.complexity, args.tier, args.free);
    const rightFit = fitCost(rightScores, args.complexity, args.tier, args.free);

    if (leftFit !== rightFit) {
      return leftFit - rightFit;
    }

    const leftSeed = seedRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = seedRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftSeed !== rightSeed) {
      return leftSeed - rightSeed;
    }

    return leftScores.pricePerMillion - rightScores.pricePerMillion;
  })[0]!;
}

function findById(models: RoutableCatalogModel[], modelId?: string | null) {
  const normalized = modelId?.trim();
  if (!normalized) {
    return null;
  }
  return models.find((model) => model.id === normalized) ?? null;
}

export function resolveModelForTurn(
  input: ResolveModelForTurnInput & { content?: string },
): ResolveModelForTurnResult {
  // Agency and Agent/Plan modes need tools; Canvas Ask prefers tools when available.
  const requireTools =
    input.signals.toolPreset === "agent" ||
    input.signals.toolPreset === "plan" ||
    input.signals.surface === "agency";
  const free = input.preset.free;
  const gates = { free, requireTools };
  const complexity = scorePromptComplexity(input.signals, input.content ?? "");

  const pinned = findById(input.models, input.pinnedModelId);
  let pinnedCleared = false;

  // Auto ignores pins; Browse-all pins only apply when Auto is off.
  if (!input.preset.auto && pinned) {
    if (isEligible(pinned, gates)) {
      return {
        model: pinned,
        modelId: pinned.id,
        pinnedCleared: false,
        reason: "pin",
      };
    }
    pinnedCleared = true;
  } else if (input.preset.auto && pinned && free && !pinned.isFree) {
    pinnedCleared = true;
  }

  const tierPool = poolForTier(input.models, input.preset.tier, gates);
  const autoPick = pickBest(tierPool, {
    complexity,
    tier: input.preset.tier,
    free,
  });

  if (autoPick) {
    return {
      model: autoPick,
      modelId: autoPick.id,
      pinnedCleared,
      reason: input.preset.auto ? "auto" : "sticky",
    };
  }

  const widened = input.models.filter((model) => isEligible(model, gates));
  const widenedPick = pickBest(widened, {
    complexity,
    tier: input.preset.tier,
    free,
  });

  if (widenedPick) {
    return {
      model: widenedPick,
      modelId: widenedPick.id,
      pinnedCleared,
      reason: "fallback",
    };
  }

  const defaultModel =
    findById(input.models, input.defaultModel) ??
    findById(input.models, DEFAULT_AGENT_MODEL) ??
    input.models.find((model) => (requireTools ? model.supportsTools : true)) ??
    input.models[0] ??
    null;

  return {
    model: defaultModel,
    modelId: defaultModel?.id ?? DEFAULT_AGENT_MODEL,
    pinnedCleared,
    reason: "fallback",
  };
}

export function formatModelPresetLabel(args: {
  tier: AgentModelTier;
  auto: boolean;
  free: boolean;
  pinnedLabel?: string | null;
}) {
  if (args.pinnedLabel) {
    return args.pinnedLabel;
  }

  const tierLabel = args.tier === "fast" ? "Fast" : args.tier === "pro" ? "Pro" : "Balanced";
  const parts = [tierLabel];
  if (args.auto) {
    parts.push("Auto");
  }
  if (args.free) {
    parts.push("Free");
  }
  return parts.join(" · ");
}

/** Single-word trigger label; full preset stays in the tooltip. */
export function formatModelPresetButtonLabel(args: {
  tier: AgentModelTier;
  auto: boolean;
  free: boolean;
  pinnedLabel?: string | null;
}) {
  if (args.pinnedLabel) {
    const firstWord = args.pinnedLabel.trim().split(/\s+/)[0];
    return firstWord || "Model";
  }
  if (args.auto) {
    return "Auto";
  }
  if (args.free) {
    return "Free";
  }
  return args.tier === "fast" ? "Fast" : args.tier === "pro" ? "Pro" : "Balanced";
}
