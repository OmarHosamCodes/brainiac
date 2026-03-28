import type { WorkspaceBlock, WorkspaceNodeTab } from "./types";

export function normalizeSelection<T extends string>(
  values: readonly T[] | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
) {
  const selected = values === undefined ? fallback : values;
  const seen = new Set<T>();
  const result: T[] = [];

  for (const value of selected) {
    if (!allowed.includes(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  if (result.length > 0 || values !== undefined) {
    return result;
  }

  return [...fallback];
}

export function getNowIsoString() {
  return new Date().toISOString();
}

export function getDueDateValue(value: string) {
  return new Date(`${value}T12:00:00`).getTime();
}

export function getTodayValue(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime();
}

export function trimToEmpty(value: string | undefined | null) {
  return value?.trim() ?? "";
}

export function truncateText(value: string, maxLength = 180) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getDisplayTabTitle(tab: WorkspaceNodeTab | null | undefined) {
  return tab?.title.trim() || "Untitled tab";
}

export function getDisplayBlockTitle(block: WorkspaceBlock | null | undefined) {
  return block?.title.trim() || "Untitled block";
}
