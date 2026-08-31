export const MAX_TIME_ENTRY_LINKS = 10;
export const MAX_TIME_ENTRY_LINK_URL_LENGTH = 2_048;

export type TimeEntryLinkRecord = {
  id: string;
  url: string;
};

/** Normalize a single URL for save; returns null when empty/invalid. */
export function normalizeTimeEntryLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (candidate.length > MAX_TIME_ENTRY_LINK_URL_LENGTH) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Trim, auto-https, validate, dedupe, and cap link URLs. */
export function normalizeTimeEntryLinkUrls(urls: readonly string[]): {
  urls: string[];
  error: string | null;
} {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalized = normalizeTimeEntryLinkUrl(trimmed);
    if (!normalized) {
      return { urls: [], error: "Enter a valid http(s) URL." };
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);

    if (out.length > MAX_TIME_ENTRY_LINKS) {
      return {
        urls: [],
        error: `At most ${MAX_TIME_ENTRY_LINKS} links per entry.`,
      };
    }
  }

  return { urls: out, error: null };
}

/** Hostname + path truncated for report cells; full URL stays in tooltip. */
export function formatTimeEntryLinkLabel(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url);
    const label = `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}`;
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
  } catch {
    if (url.length <= maxLength) return url;
    return `${url.slice(0, maxLength - 1)}…`;
  }
}

/** Join unique link URLs in entry order with a middle-dot separator. */
export function joinedTimeEntryLinkUrls(
  entries: readonly { links?: readonly TimeEntryLinkRecord[] | null }[],
): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.links ?? []) {
      const url = link.url.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      parts.push(url);
    }
  }
  return parts.join(" · ");
}

export function collectTimeEntryLinkRecords(
  entries: readonly { links?: readonly TimeEntryLinkRecord[] | null }[],
): TimeEntryLinkRecord[] {
  const out: TimeEntryLinkRecord[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.links ?? []) {
      const url = link.url.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ id: link.id, url });
    }
  }
  return out;
}
