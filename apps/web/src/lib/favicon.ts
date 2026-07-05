const DEFAULT_FAVICON = "/favicon.svg";
const TRACKING_FAVICON = "/favicon-tracking.svg";

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="icon"]');
}

export function setFavicon(href: string): void {
  if (typeof document === "undefined") return;

  const link = getFaviconLink();
  if (link) {
    link.href = href;
    return;
  }

  const created = document.createElement("link");
  created.rel = "icon";
  created.type = "image/svg+xml";
  created.href = href;
  document.head.appendChild(created);
}

export function setTrackingFavicon(isTracking: boolean): void {
  setFavicon(isTracking ? TRACKING_FAVICON : DEFAULT_FAVICON);
}
