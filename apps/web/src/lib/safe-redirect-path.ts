const DEFAULT_REDIRECT = "/canvas";

/** Same-origin relative path only. Rejects protocol-relative and `/\evil.com` open redirects. */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_REDIRECT;

  let path = value.trim();
  if (!path) return DEFAULT_REDIRECT;

  try {
    path = decodeURIComponent(path);
  } catch {
    return DEFAULT_REDIRECT;
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return DEFAULT_REDIRECT;
  }
  if (path.includes("://") || [...path].some((char) => char.charCodeAt(0) <= 32)) {
    return DEFAULT_REDIRECT;
  }

  return path;
}

export function optionalSafeRedirectPath(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const safe = safeRedirectPath(value);
  if (safe === DEFAULT_REDIRECT && value.trim() !== DEFAULT_REDIRECT) return undefined;
  return safe;
}
