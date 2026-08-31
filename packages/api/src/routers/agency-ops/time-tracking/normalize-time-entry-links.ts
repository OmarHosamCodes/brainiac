import { ORPCError } from "@orpc/server";

export const MAX_TIME_ENTRY_LINKS = 10;
export const MAX_TIME_ENTRY_LINK_URL_LENGTH = 2_048;

/** Trim, auto-https, validate, dedupe, and cap link URLs for time entries. */
export function normalizeTimeEntryLinkUrls(urls: string[] | undefined): string[] {
  if (urls === undefined) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    if (candidate.length > MAX_TIME_ENTRY_LINK_URL_LENGTH) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Link URLs must be at most ${MAX_TIME_ENTRY_LINK_URL_LENGTH} characters.`,
      });
    }

    let normalized: string;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
      normalized = parsed.toString();
    } catch {
      throw new ORPCError("BAD_REQUEST", { message: "One or more link URLs are invalid." });
    }

    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);

    if (out.length > MAX_TIME_ENTRY_LINKS) {
      throw new ORPCError("BAD_REQUEST", {
        message: `At most ${MAX_TIME_ENTRY_LINKS} links per entry.`,
      });
    }
  }

  return out;
}
