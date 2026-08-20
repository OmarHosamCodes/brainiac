import { optionalSafeRedirectPath } from "@/lib/safe-redirect-path";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function validateLooseSearch(search: Record<string, unknown>): Record<string, unknown> {
  return { ...search };
}

export function validatePeriodSearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
} {
  return {
    from: optionalString(search.from),
    to: optionalString(search.to),
  };
}

export function validateReportSearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
  fields?: string;
  showWaste?: string;
  mergeTasks?: string;
} {
  return {
    ...validatePeriodSearch(search),
    fields: optionalString(search.fields),
    showWaste: optionalString(search.showWaste),
    mergeTasks: optionalString(search.mergeTasks),
  };
}

export function validateProfileSearch(search: Record<string, unknown>): {
  focus?: string;
  alertId?: string;
  day?: string;
  period?: string;
} {
  return {
    focus: optionalString(search.focus),
    alertId: optionalString(search.alertId),
    day: optionalString(search.day),
    period: optionalString(search.period),
  };
}

export function validateProjectSearch(search: Record<string, unknown>): {
  focusTask?: string;
} {
  return {
    focusTask: optionalString(search.focusTask),
  };
}

export function validateLoginSearch(search: Record<string, unknown>): {
  redirect?: string;
  error?: string;
  mode?: string;
  checkout_id?: string;
} {
  return {
    redirect: optionalSafeRedirectPath(optionalString(search.redirect)),
    error: optionalString(search.error),
    mode: optionalString(search.mode),
    checkout_id: optionalString(search.checkout_id),
  };
}
