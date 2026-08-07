/** Shared deep-link builder for profile alert URLs (Needs-action, inbox, account menu). */

export function buildMemberProfileAlertHref(input: {
  subjectUserId: string;
  alertId?: string | null;
  dateKey?: string | null;
  periodKey?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("focus", "alerts");
  if (input.alertId) params.set("alertId", input.alertId);
  if (input.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) {
    params.set("day", input.dateKey);
  } else if (input.periodKey && /^\d{4}-\d{2}$/.test(input.periodKey)) {
    params.set("period", input.periodKey);
  }
  return `/agency/members/${encodeURIComponent(input.subjectUserId)}?${params.toString()}`;
}
