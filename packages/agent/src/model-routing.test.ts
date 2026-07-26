import { describe, expect, test } from "bun:test";

import {
  classifyModelTier,
  formatModelPresetLabel,
  resolveModelForTurn,
  scorePromptComplexity,
  type RoutableCatalogModel,
} from "./model-routing";

function model(partial: Partial<RoutableCatalogModel> & Pick<RoutableCatalogModel, "id">) {
  return {
    name: partial.name ?? partial.id,
    contextLength: partial.contextLength ?? 128_000,
    supportsTools: partial.supportsTools ?? true,
    pricing: partial.pricing ?? {
      prompt: "0.000001",
      completion: "0.000002",
    },
    isFree: partial.isFree ?? false,
    ...partial,
  } satisfies RoutableCatalogModel;
}

const catalog = [
  model({
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    pricing: { prompt: "0.0000001", completion: "0.0000002" },
  }),
  model({
    id: "openai/gpt-4o",
    name: "GPT-4o",
    pricing: { prompt: "0.0000025", completion: "0.00001" },
  }),
  model({
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    pricing: { prompt: "0.000015", completion: "0.000075" },
  }),
  model({
    id: "meta/llama-free",
    name: "Llama Free",
    isFree: true,
    pricing: { prompt: "0", completion: "0" },
    supportsTools: true,
  }),
  model({
    id: "vendor/no-tools-flash",
    name: "Flash No Tools",
    supportsTools: false,
    pricing: { prompt: "0.0000001", completion: "0.0000001" },
  }),
];

describe("model routing", () => {
  test("classifies seed and heuristic tiers", () => {
    expect(classifyModelTier(catalog[0]!)).toBe("fast");
    expect(classifyModelTier(catalog[1]!)).toBe("balanced");
    expect(classifyModelTier(catalog[2]!)).toBe("pro");
  });

  test("auto picks within free pool when Free is on", () => {
    const result = resolveModelForTurn({
      models: catalog,
      defaultModel: "openai/gpt-5-nano",
      preset: { tier: "balanced", auto: true, free: true },
      signals: {
        contentLength: 40,
        scopeCount: 0,
        mentionCount: 0,
        toolPreset: "ask",
      },
      content: "hello",
    });

    expect(result.modelId).toBe("meta/llama-free");
    expect(result.model?.isFree).toBe(true);
  });

  test("agent mode never selects a no-tools model", () => {
    const result = resolveModelForTurn({
      models: catalog,
      defaultModel: "openai/gpt-5-nano",
      preset: { tier: "fast", auto: true, free: false },
      signals: {
        contentLength: 20,
        scopeCount: 0,
        mentionCount: 0,
        toolPreset: "agent",
      },
      content: "hi",
    });

    expect(result.model?.supportsTools).toBe(true);
    expect(result.modelId).not.toBe("vendor/no-tools-flash");
  });

  test("pin is honored when Auto is off", () => {
    const result = resolveModelForTurn({
      models: catalog,
      defaultModel: "openai/gpt-5-nano",
      preset: { tier: "fast", auto: false, free: false },
      pinnedModelId: "anthropic/claude-opus-4",
      signals: {
        contentLength: 10,
        scopeCount: 0,
        mentionCount: 0,
        toolPreset: "ask",
      },
    });

    expect(result.modelId).toBe("anthropic/claude-opus-4");
    expect(result.reason).toBe("pin");
  });

  test("Free clears ineligible paid pin", () => {
    const result = resolveModelForTurn({
      models: catalog,
      defaultModel: "openai/gpt-5-nano",
      preset: { tier: "pro", auto: false, free: true },
      pinnedModelId: "anthropic/claude-opus-4",
      signals: {
        contentLength: 10,
        scopeCount: 0,
        mentionCount: 0,
        toolPreset: "ask",
      },
    });

    expect(result.pinnedCleared).toBe(true);
    expect(result.model?.isFree).toBe(true);
  });

  test("complexity rises with agent mode and keywords", () => {
    const simple = scorePromptComplexity(
      {
        contentLength: 20,
        scopeCount: 0,
        mentionCount: 0,
        toolPreset: "ask",
      },
      "hi",
    );
    const hard = scorePromptComplexity(
      {
        contentLength: 1_200,
        scopeCount: 4,
        mentionCount: 2,
        toolPreset: "agent",
      },
      "please refactor and architect this",
    );

    expect(hard).toBeGreaterThan(simple);
  });

  test("formatModelPresetLabel prefers pinned name", () => {
    expect(
      formatModelPresetLabel({
        tier: "balanced",
        auto: true,
        free: true,
        pinnedLabel: "Claude Opus 4",
      }),
    ).toBe("Claude Opus 4");
    expect(formatModelPresetLabel({ tier: "fast", auto: true, free: false })).toBe("Fast · Auto");
  });
});
