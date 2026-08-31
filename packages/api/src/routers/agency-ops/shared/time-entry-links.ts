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

export type NormalizeTimeEntryLinkUrlsResult = {
  urls: string[];
  error: string | null;
};

/** Trim, auto-https, validate, dedupe, and cap link URLs. */
export function normalizeTimeEntryLinkUrlList(
  urls: readonly string[] | undefined,
  options?: { treatUndefinedAsEmpty?: boolean },
): NormalizeTimeEntryLinkUrlsResult {
  if (urls === undefined && options?.treatUndefinedAsEmpty) {
    return { urls: [], error: null };
  }
  if (urls === undefined) {
    return { urls: [], error: null };
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.length > MAX_TIME_ENTRY_LINK_URL_LENGTH) {
      return {
        urls: [],
        error: `Link URLs must be at most ${MAX_TIME_ENTRY_LINK_URL_LENGTH} characters.`,
      };
    }

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

/** Merge unique links from entries in first-seen order. */
export function mergeTimeEntryLinkRecords<T extends TimeEntryLinkRecord>(
  entries: readonly { links?: readonly T[] | null }[],
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    for (const link of entry.links ?? []) {
      const url = link.url.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(link);
    }
  }
  return out;
}

/** Join unique link URLs in entry order with a middle-dot separator. */
export function joinedTimeEntryLinkUrls(
  entries: readonly { links?: readonly TimeEntryLinkRecord[] | null }[],
): string {
  return mergeTimeEntryLinkRecords(entries)
    .map((link) => link.url)
    .join(" · ");
}
