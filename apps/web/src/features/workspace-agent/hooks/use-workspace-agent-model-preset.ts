import { formatModelPresetButtonLabel, formatModelPresetLabel } from "@orch/agent/model-routing";
import {
  DEFAULT_AGENT_MODEL_PRESET,
  type AgentModelPreset,
  type AgentModelTier,
} from "@orch/agent/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PRESET_STORAGE_KEY = "orch:agent-model-preset";
const STICKY_STORAGE_KEY = "orch:agent-model-sticky";
const PIN_STORAGE_KEY = "orch:agent-model-pin";

type StickyByTier = Partial<Record<AgentModelTier, string>>;

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useWorkspaceAgentModelPreset(args: {
  isFreeTier?: boolean;
  modelOptions: Array<{ id: string; label: string; isFree: boolean }>;
}) {
  const [tier, setTierState] = useState<AgentModelTier>(
    () => readJson<AgentModelPreset>(PRESET_STORAGE_KEY)?.tier ?? DEFAULT_AGENT_MODEL_PRESET.tier,
  );
  const [auto, setAutoState] = useState(
    () => readJson<AgentModelPreset>(PRESET_STORAGE_KEY)?.auto ?? DEFAULT_AGENT_MODEL_PRESET.auto,
  );
  const [free, setFreeState] = useState(
    () => readJson<AgentModelPreset>(PRESET_STORAGE_KEY)?.free ?? DEFAULT_AGENT_MODEL_PRESET.free,
  );
  const [pinnedModelId, setPinnedModelIdState] = useState<string | null>(
    () => readJson<string | null>(PIN_STORAGE_KEY) ?? null,
  );
  const [stickyByTier, setStickyByTier] = useState<StickyByTier>(
    () => readJson<StickyByTier>(STICKY_STORAGE_KEY) ?? {},
  );
  const [lastResolvedModelId, setLastResolvedModelId] = useState<string | null>(null);
  const [freeDefaultApplied, setFreeDefaultApplied] = useState(false);

  useEffect(() => {
    writeJson(PRESET_STORAGE_KEY, { tier, auto, free } satisfies AgentModelPreset);
  }, [auto, free, tier]);

  useEffect(() => {
    writeJson(PIN_STORAGE_KEY, pinnedModelId);
  }, [pinnedModelId]);

  useEffect(() => {
    writeJson(STICKY_STORAGE_KEY, stickyByTier);
  }, [stickyByTier]);

  useEffect(() => {
    if (freeDefaultApplied || args.isFreeTier !== true) {
      return;
    }
    setFreeState(true);
    setFreeDefaultApplied(true);
  }, [args.isFreeTier, freeDefaultApplied]);

  const modelById = useMemo(() => {
    return new Map(args.modelOptions.map((model) => [model.id, model]));
  }, [args.modelOptions]);

  const clearPinIfNeeded = useCallback(
    (nextFree: boolean, nextPin: string | null) => {
      if (!nextFree || !nextPin) {
        return nextPin;
      }
      const pinned = modelById.get(nextPin);
      if (pinned && !pinned.isFree) {
        toast.message("Switched to Free models");
        return null;
      }
      return nextPin;
    },
    [modelById],
  );

  const setTier = useCallback((next: AgentModelTier) => {
    setTierState(next);
  }, []);

  const setAuto = useCallback((next: boolean) => {
    setAutoState(next);
    if (next) {
      setPinnedModelIdState(null);
    }
  }, []);

  const setFree = useCallback(
    (next: boolean) => {
      setFreeState(next);
      setPinnedModelIdState((current) => clearPinIfNeeded(next, current));
    },
    [clearPinIfNeeded],
  );

  const pinModel = useCallback(
    (modelId: string) => {
      const nextPin = clearPinIfNeeded(free, modelId);
      setPinnedModelIdState(nextPin);
      setAutoState(false);
      if (nextPin) {
        setStickyByTier((current) => ({ ...current, [tier]: nextPin }));
      }
    },
    [clearPinIfNeeded, free, tier],
  );

  const rememberResolvedModel = useCallback(
    (modelId: string | null | undefined) => {
      const normalized = modelId?.trim();
      if (!normalized) {
        return;
      }
      setLastResolvedModelId(normalized);
      setStickyByTier((current) => ({ ...current, [tier]: normalized }));
    },
    [tier],
  );

  const modelPreset: AgentModelPreset = useMemo(() => ({ tier, auto, free }), [auto, free, tier]);

  const outboundModelId = useMemo(() => {
    if (auto) {
      return undefined;
    }
    return pinnedModelId ?? stickyByTier[tier] ?? lastResolvedModelId ?? undefined;
  }, [auto, lastResolvedModelId, pinnedModelId, stickyByTier, tier]);

  const pinnedLabel = pinnedModelId ? (modelById.get(pinnedModelId)?.label ?? null) : null;

  const selectedModelLabel = formatModelPresetLabel({
    tier,
    auto,
    free,
    pinnedLabel: auto ? null : pinnedLabel,
  });
  const selectedModelButtonLabel = formatModelPresetButtonLabel({
    tier,
    auto,
    free,
    pinnedLabel: auto ? null : pinnedLabel,
  });

  const resolvedModelLabel =
    lastResolvedModelId != null
      ? (modelById.get(lastResolvedModelId)?.label ?? lastResolvedModelId)
      : null;

  return {
    modelPreset,
    tier,
    auto,
    free,
    pinnedModelId,
    outboundModelId,
    selectedModelLabel,
    selectedModelButtonLabel,
    resolvedModelLabel,
    lastResolvedModelId,
    setTier,
    setAuto,
    setFree,
    pinModel,
    rememberResolvedModel,
  };
}
