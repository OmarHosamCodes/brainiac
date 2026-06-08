export type NormalizedAgencyLinkUrlResult = {
  normalizedUrl: string | null;
  error: string | null;
};

export function normalizeAgencyLinkUrl(
  value: string | null | undefined,
): NormalizedAgencyLinkUrlResult {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return {
      normalizedUrl: null,
      error: null,
    };
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(candidate);
  } catch {
    return {
      normalizedUrl: null,
      error: "Enter a valid http(s) URL.",
    };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      normalizedUrl: null,
      error: "Enter a valid http(s) URL.",
    };
  }

  return {
    normalizedUrl: parsedUrl.toString(),
    error: null,
  };
}

/**
 * Build a compact, human-friendly label for a normalized agency link URL.
 *
 * Strips the protocol and any leading "www.", and trims a trailing slash on
 * bare-host URLs so chips/badges render as "example.com/path" instead of
 * "https://www.example.com/path/". Returns an empty string for nullish input
 * so it can be used directly in templates.
 */
export function getAgencyLinkUrlDisplayLabel(normalizedUrl: string | null | undefined): string {
  if (!normalizedUrl) {
    return "";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return normalizedUrl;
  }

  const host = parsedUrl.host.replace(/^www\./, "");
  const pathname = parsedUrl.pathname === "/" ? "" : parsedUrl.pathname;
  const search = parsedUrl.search;
  const hash = parsedUrl.hash;

  return `${host}${pathname}${search}${hash}`;
}
