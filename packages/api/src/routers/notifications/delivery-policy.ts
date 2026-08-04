import type { NotificationDeliveryClass, NotificationType } from "@orch/db/schema";

export type DeliveryPolicyInput = {
  type: NotificationType;
  assignedToTeam?: boolean;
  hasActiveTimer?: boolean;
  quietOrFocusActive?: boolean;
};

export type DeliveryDecision = {
  deliveryClass: NotificationDeliveryClass;
  /** Whether push may fire immediately when prefs allow (center row already persisted). */
  pushNow: boolean;
  /** Hold push until timer stop or deliverAfter cap. */
  deferPush: boolean;
  /** Hard suppress (e.g. whole-team assignment broadcast). */
  forceSuppressPush: boolean;
};

const ACTION_TYPES: ReadonlySet<NotificationType> = new Set(["task.assigned", "task.message"]);

export function isActionNotificationType(type: NotificationType) {
  return ACTION_TYPES.has(type);
}

export function resolveBaseDeliveryClass(
  type: NotificationType,
  input: { assignedToTeam?: boolean } = {},
): NotificationDeliveryClass {
  switch (type) {
    case "task.assigned":
      return input.assignedToTeam ? "center" : "interrupt";
    case "task.message":
      return "interrupt";
    case "journey.milestone":
      return "center";
    case "timer.activity":
      return "center";
    case "team.digest":
      return "digest";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Center-first policy: persist always happens upstream when inApp is on.
 * Push eligibility is class + timing (quiet/focus/timer), then prefs.
 */
export function resolveDeliveryDecision(input: DeliveryPolicyInput): DeliveryDecision {
  const base = resolveBaseDeliveryClass(input.type, {
    assignedToTeam: input.assignedToTeam,
  });

  if (input.type === "task.assigned" && input.assignedToTeam) {
    return {
      deliveryClass: "center",
      pushNow: false,
      deferPush: false,
      forceSuppressPush: true,
    };
  }

  if (base === "center" || base === "digest") {
    return {
      deliveryClass: base,
      pushNow: !input.quietOrFocusActive,
      deferPush: false,
      forceSuppressPush: false,
    };
  }

  // interrupt path
  if (input.quietOrFocusActive) {
    return {
      deliveryClass: "interrupt",
      pushNow: false,
      deferPush: false,
      forceSuppressPush: false,
    };
  }

  if (input.hasActiveTimer) {
    return {
      deliveryClass: "breakpoint",
      pushNow: false,
      deferPush: true,
      forceSuppressPush: false,
    };
  }

  return {
    deliveryClass: "interrupt",
    pushNow: true,
    deferPush: false,
    forceSuppressPush: false,
  };
}

/** Local HH:mm quiet window; supports overnight ranges (e.g. 22:00–07:00). */
export function isWithinQuietHours(
  now: Date,
  timeZone: string,
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const startMinutes = parseClockToMinutes(quietHoursStart);
  const endMinutes = parseClockToMinutes(quietHoursEnd);
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return false;

  const localMinutes = getLocalMinutes(now, timeZone);
  if (localMinutes === null) return false;

  if (startMinutes < endMinutes) {
    return localMinutes >= startMinutes && localMinutes < endMinutes;
  }
  // Overnight window
  return localMinutes >= startMinutes || localMinutes < endMinutes;
}

export function getLocalHour(now: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value;
    if (hour === undefined) return null;
    return Number.parseInt(hour, 10);
  } catch {
    return null;
  }
}

export function getLocalDateString(now: Date, timeZone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

/** Yesterday's calendar date in the given timezone (YYYY-MM-DD). */
export function getLocalYesterdayDateString(now: Date, timeZone: string): string | null {
  const today = getLocalDateString(now, timeZone);
  if (!today) return null;
  const [year, month, day] = today.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  const civil = new Date(Date.UTC(year, month - 1, day));
  civil.setUTCDate(civil.getUTCDate() - 1);
  return civil.toISOString().slice(0, 10);
}

function getLocalMinutes(now: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;
    if (hour === undefined || minute === undefined) return null;
    return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
  } catch {
    return null;
  }
}

function parseClockToMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

/** Max hold for breakpoint push when a timer is running. */
export const BREAKPOINT_PUSH_MAX_DEFER_MS = 15 * 60 * 1000;

/** Local morning hour for digest delivery. */
export const DIGEST_LOCAL_HOUR = 8;
