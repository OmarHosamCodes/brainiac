const SKIP_KEYS = new Set(["type", "teamId", "actorUserId", "userId", "proposalId", "action"]);

export type ProposalPreviewLine = {
  label: string;
  value: string;
};

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function scalarText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

/** Flatten a proposal before/after payload into short labeled rows. */
export function proposalPreviewLines(value: unknown): ProposalPreviewLine[] {
  if (value == null) return [];
  const scalar = scalarText(value);
  if (scalar) return [{ label: "Value", value: scalar }];
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    const items = value
      .map((item) => scalarText(item) ?? (item && typeof item === "object" ? "Item" : null))
      .filter((item): item is string => Boolean(item));
    if (items.length === 0) return [];
    return [{ label: "Items", value: items.slice(0, 6).join(", ") }];
  }
  if (typeof value !== "object") return [];

  const lines: ProposalPreviewLine[] = [];
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SKIP_KEYS.has(key)) continue;
    const text = scalarText(entry);
    if (!text) continue;
    lines.push({ label: labelFromKey(key), value: text });
    if (lines.length >= 8) break;
  }
  return lines;
}

export function proposalPreviewEmptyLabel(value: unknown): string {
  return value == null ? "Nothing yet" : "No readable fields";
}
