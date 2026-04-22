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
