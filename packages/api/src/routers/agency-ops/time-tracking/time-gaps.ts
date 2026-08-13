export const AGENCY_TIME_GAP_MIN_SECONDS = 60;

export type AgencyTimeGapEntry = {
  startedAt: string;
  endedAt: string;
  projectId: string | null;
  taskId: string | null;
};

export type AgencyTimeGap = {
  startAt: string;
  endAt: string;
  durationSeconds: number;
  projectId: string | null;
  taskId: string | null;
};

function toMs(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function carveAgencyTimeGaps(input: {
  fromMs: number;
  toMs: number;
  entries: readonly AgencyTimeGapEntry[];
}): AgencyTimeGap[] {
  const windowStart = input.fromMs;
  const windowEnd = input.toMs;
  if (!(windowEnd > windowStart)) return [];

  const ordered = [...input.entries]
    .map((entry) => {
      const startedAt = toMs(entry.startedAt);
      const endedAt = toMs(entry.endedAt);
      if (startedAt === null || endedAt === null || endedAt <= startedAt) return null;
      return { ...entry, startedAtMs: startedAt, endedAtMs: endedAt };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.startedAtMs - right.startedAtMs);

  const cursorEnds: number[] = [windowStart];
  const gaps: AgencyTimeGap[] = [];

  for (const [index, entry] of ordered.entries()) {
    const gapStart = Math.max(cursorEnds[cursorEnds.length - 1] ?? windowStart, windowStart);
    const gapEnd = Math.min(entry.startedAtMs, windowEnd);
    pushGap(gaps, gapStart, gapEnd, ordered[index - 1] ?? null, entry);
    cursorEnds.push(Math.max(entry.endedAtMs, gapStart));
  }

  const last = ordered[ordered.length - 1] ?? null;
  const tailStart = Math.max(last?.endedAtMs ?? windowStart, windowStart);
  pushGap(gaps, tailStart, windowEnd, last, null);
  return gaps;
}

function pushGap(
  gaps: AgencyTimeGap[],
  startMs: number,
  endMs: number,
  previous: { projectId: string | null; taskId: string | null } | null,
  next: { projectId: string | null; taskId: string | null } | null,
) {
  const durationSeconds = Math.floor((endMs - startMs) / 1000);
  if (durationSeconds < AGENCY_TIME_GAP_MIN_SECONDS) return;
  const neighbor = previous ?? next;
  gaps.push({
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    durationSeconds,
    projectId: neighbor?.projectId ?? null,
    taskId: neighbor?.taskId ?? null,
  });
}
