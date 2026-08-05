export function toggleIdInList(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((id) => typeof id === "string"),
  );
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

export function normalizeStringRecord(value: unknown): Record<string, string> {
  return isStringRecord(value) ? value : {};
}

export function normalizeStringArrayRecord(value: unknown): Record<string, string[]> {
  return isStringArrayRecord(value) ? value : {};
}

export function normalizeNumberRecord(value: unknown): Record<string, number> {
  return isNumberRecord(value) ? value : {};
}
