export const AGENCY_LOGO_ANIMATION_MS = 4000;
export const AGENCY_BOOT_TIMEOUT_MS = 15_000;

let bootStartedAt: number | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function startAgencyBoot(): void {
  if (bootStartedAt === null) {
    bootStartedAt = Date.now();
  }
}

export function resetAgencyBoot(): void {
  bootStartedAt = null;
}

export function isAgencyAnimationReadyAt(now: number, startedAt: number | null): boolean {
  if (startedAt === null) return false;
  return now - startedAt >= AGENCY_LOGO_ANIMATION_MS;
}

export function isAgencyAnimationReady(): boolean {
  if (prefersReducedMotion()) return true;
  return isAgencyAnimationReadyAt(Date.now(), bootStartedAt);
}
