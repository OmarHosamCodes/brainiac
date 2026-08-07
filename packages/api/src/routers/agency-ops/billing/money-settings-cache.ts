import type { AgencyOpsMoneyCalcOptionsJson, AgencyOpsMoneyRulesJson } from "@orch/db/schema";

export type AgencyMoneySettingsRecord = {
  teamId: string;
  currency: string;
  currencyLockedAt: string | null;
  rules: AgencyOpsMoneyRulesJson;
  calcOptions: AgencyOpsMoneyCalcOptionsJson;
  updatedAt: string;
};

type MoneySettingsCacheEntry = {
  value: AgencyMoneySettingsRecord;
  expiresAt: number;
};

// ponytail: process-memory TTL; upgrade to Redis when multi-instance cache coherence matters.
const MONEY_SETTINGS_CACHE_TTL_MS = 60_000;
const moneySettingsCache = new Map<string, MoneySettingsCacheEntry>();

export function getCachedMoneySettings(teamId: string): AgencyMoneySettingsRecord | undefined {
  const cached = moneySettingsCache.get(teamId);
  if (!cached || cached.expiresAt <= Date.now()) return undefined;
  return cached.value;
}

export function setCachedMoneySettings(teamId: string, value: AgencyMoneySettingsRecord) {
  moneySettingsCache.set(teamId, {
    value,
    expiresAt: Date.now() + MONEY_SETTINGS_CACHE_TTL_MS,
  });
}

export function invalidateMoneySettingsCache(teamId: string) {
  moneySettingsCache.delete(teamId);
}
