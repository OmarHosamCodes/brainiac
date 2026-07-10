export const SHELL_LOGO_ANIMATION_MS = 4000;
export const SHELL_BOOT_TIMEOUT_MS = 15_000;

let bootStartedAt: number | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function startShellBoot(): void {
  if (bootStartedAt === null) {
    bootStartedAt = Date.now();
  }
}

export function resetShellBoot(): void {
  bootStartedAt = null;
}

export function isShellAnimationReadyAt(now: number, startedAt: number | null): boolean {
  if (startedAt === null) return false;
  return now - startedAt >= SHELL_LOGO_ANIMATION_MS;
}

export function isShellAnimationReady(): boolean {
  if (prefersReducedMotion()) return true;
  return isShellAnimationReadyAt(Date.now(), bootStartedAt);
}
