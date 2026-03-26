import type { Model } from "@openrouter/sdk/models";
import { env } from "@brainiac/env/server";
import { z } from "zod";

import { createOpenRouterClient } from "./client";
import { DEFAULT_AGENT_MODEL } from "./types";

const FREE_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

export const openRouterFreeModelSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  contextLength: z.number().int().positive().nullable(),
  provider: z.string().trim().min(1),
  inputModalities: z.array(z.string()),
  outputModalities: z.array(z.string()),
  supportsTools: z.boolean(),
});

export const openRouterFreeModelsResponseSchema = z.object({
  defaultModel: z.string().trim().min(1),
  models: z.array(openRouterFreeModelSchema),
});

export type OpenRouterFreeModel = z.infer<typeof openRouterFreeModelSchema>;
export type OpenRouterFreeModelsResponse = z.infer<typeof openRouterFreeModelsResponseSchema>;

type FreeModelCache = {
  expiresAt: number;
  response: OpenRouterFreeModelsResponse;
};

let freeModelCache: FreeModelCache | null = null;
let freeModelRequest: Promise<OpenRouterFreeModelsResponse> | null = null;

function getProviderLabel(model: Model) {
  const providerFromName = model.name.split(":")[0]?.trim();

  if (providerFromName) {
    return providerFromName;
  }

  return model.id.split("/")[0] ?? model.id;
}

function isZeroPrice(value?: string | null) {
  return Number(value ?? "0") === 0;
}

function isFreeModel(model: Model) {
  return (
    model.id.endsWith(":free") ||
    (isZeroPrice(model.pricing.prompt) &&
      isZeroPrice(model.pricing.completion) &&
      isZeroPrice(model.pricing.request))
  );
}

function hasTextOutput(model: Model) {
  return model.architecture.outputModalities.includes("text");
}

function toFreeModel(model: Model): OpenRouterFreeModel | null {
  if (!isFreeModel(model) || !hasTextOutput(model)) {
    return null;
  }

  return {
    id: model.id,
    name: model.name,
    description: model.description?.trim() || null,
    contextLength: model.contextLength,
    provider: getProviderLabel(model),
    inputModalities: model.architecture.inputModalities,
    outputModalities: model.architecture.outputModalities,
    supportsTools: model.supportedParameters.includes("tools"),
  };
}

function sortFreeModels(models: OpenRouterFreeModel[]) {
  return [...models].sort((left, right) => {
    if (left.id === DEFAULT_AGENT_MODEL) {
      return -1;
    }

    if (right.id === DEFAULT_AGENT_MODEL) {
      return 1;
    }

    if (left.supportsTools !== right.supportsTools) {
      return left.supportsTools ? -1 : 1;
    }

    const contextLengthDifference = (right.contextLength ?? 0) - (left.contextLength ?? 0);

    if (contextLengthDifference !== 0) {
      return contextLengthDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

function getDefaultFreeModelId(models: OpenRouterFreeModel[]) {
  return models.find((model) => model.id === DEFAULT_AGENT_MODEL)?.id
    ?? models[0]?.id
    ?? DEFAULT_AGENT_MODEL;
}

async function fetchOpenRouterFreeModels() {
  const response = await createOpenRouterClient().models.listForUser({
    bearer: env.OPENROUTER_API_KEY,
  });
  const models = sortFreeModels(
    response.data
      .map(toFreeModel)
      .filter((model): model is OpenRouterFreeModel => model !== null),
  );

  return openRouterFreeModelsResponseSchema.parse({
    defaultModel: getDefaultFreeModelId(models),
    models,
  });
}

export async function listOpenRouterFreeModels(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && freeModelCache && freeModelCache.expiresAt > now) {
    return freeModelCache.response;
  }

  if (freeModelRequest) {
    return freeModelRequest;
  }

  freeModelRequest = fetchOpenRouterFreeModels()
    .then((response) => {
      freeModelCache = {
        expiresAt: Date.now() + FREE_MODEL_CACHE_TTL_MS,
        response,
      };

      return response;
    })
    .catch((error) => {
      if (freeModelCache) {
        return freeModelCache.response;
      }

      throw error;
    })
    .finally(() => {
      freeModelRequest = null;
    });

  return freeModelRequest;
}

export async function getOpenRouterFreeModel(modelId: string) {
  const normalizedModelId = modelId.trim();

  if (!normalizedModelId) {
    return null;
  }

  const { models } = await listOpenRouterFreeModels();

  return models.find((model) => model.id === normalizedModelId) ?? null;
}

export async function resolveOpenRouterFreeModel(modelId?: string | null) {
  const normalizedModelId = modelId?.trim();

  try {
    const catalog = await listOpenRouterFreeModels();
    const selectedModel = normalizedModelId
      ? catalog.models.find((model) => model.id === normalizedModelId)
      : null;

    if (selectedModel) {
      return selectedModel;
    }

    return catalog.models.find((model) => model.id === catalog.defaultModel)
      ?? catalog.models[0]
      ?? null;
  } catch {
    return null;
  }
}
