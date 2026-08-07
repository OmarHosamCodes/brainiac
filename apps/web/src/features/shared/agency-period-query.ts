/** Period handoff query params for Dashboard → Reports / Money. */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type AgencyPeriodQuerySeed = {
  from: string;
  to: string;
};

export function parseAgencyPeriodQuery(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): AgencyPeriodQuerySeed | null {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !DATE_KEY.test(from) || !DATE_KEY.test(to) || to < from) {
    return null;
  }
  return { from, to };
}

export function appendAgencyPeriodQuery(
  params: URLSearchParams,
  range: { from: string; to: string },
): URLSearchParams {
  const from = range.from.slice(0, 10);
  const to = range.to.slice(0, 10);
  if (DATE_KEY.test(from) && DATE_KEY.test(to)) {
    params.set("from", from);
    params.set("to", to);
  }
  return params;
}

export function buildAgencyReportsPeriodHref(range: { from: string; to: string }): string {
  const params = appendAgencyPeriodQuery(new URLSearchParams(), range);
  params.set("section", "reports");
  return `/agency?${params.toString()}`;
}

export function buildAgencyMoneyPeriodHref(range: { from: string; to: string }): string {
  const params = appendAgencyPeriodQuery(new URLSearchParams(), range);
  params.set("section", "management");
  params.set("manage", "money");
  return `/agency?${params.toString()}`;
}
