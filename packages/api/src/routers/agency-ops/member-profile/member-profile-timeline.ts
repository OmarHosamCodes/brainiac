export type MemberProfileActivityEventType = "time_logged" | "waste_marked" | "leave";

export type MemberProfileLeaveType = "pto" | "sick" | "team_holiday" | "other";

export function leaveTypeTitle(type: MemberProfileLeaveType): string {
  switch (type) {
    case "pto":
      return "PTO";
    case "sick":
      return "Sick leave";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Leave";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function buildTimeEntryActivity(input: {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  projectName: string | null;
  durationSeconds: number;
  isWaste: boolean;
}): {
  kind: "activity";
  id: string;
  date: string;
  createdAt: string;
  eventType: "time_logged" | "waste_marked";
  title: string;
  body: string | null;
  meta: string | null;
  durationSeconds: number;
} {
  const hours = Math.floor(input.durationSeconds / 3600);
  const minutes = Math.floor((input.durationSeconds % 3600) / 60);
  const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const description = input.description.trim();
  const projectMeta = input.projectName ? `Project · ${input.projectName}` : null;

  if (input.isWaste) {
    return {
      kind: "activity",
      id: input.id,
      date: input.date,
      createdAt: input.createdAt,
      eventType: "waste_marked",
      title: "Waste marked",
      body: description ? `${durationLabel} · ${description}` : `${durationLabel} marked as waste`,
      meta: projectMeta,
      durationSeconds: input.durationSeconds,
    };
  }

  return {
    kind: "activity",
    id: input.id,
    date: input.date,
    createdAt: input.createdAt,
    eventType: "time_logged",
    title: description || "Time logged",
    body: description ? `Logged ${durationLabel}` : null,
    meta: projectMeta,
    durationSeconds: input.durationSeconds,
  };
}

/** One leave event on the first overlapping day inside the window. */
export function buildLeaveActivity(input: {
  id: string;
  type: MemberProfileLeaveType;
  reason: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  windowStart: string;
  windowEnd: string;
}): {
  kind: "activity";
  id: string;
  date: string;
  createdAt: string;
  eventType: "leave";
  title: string;
  body: string | null;
  meta: string;
  durationSeconds: null;
} | null {
  if (input.endDate < input.windowStart || input.startDate > input.windowEnd) return null;
  const date = input.startDate < input.windowStart ? input.windowStart : input.startDate;
  const rangeLabel =
    input.startDate === input.endDate ? input.startDate : `${input.startDate} → ${input.endDate}`;
  return {
    kind: "activity",
    id: `leave-${input.id}`,
    date,
    createdAt: input.createdAt,
    eventType: "leave",
    title: leaveTypeTitle(input.type),
    body: input.reason?.trim() || null,
    meta: rangeLabel,
    durationSeconds: null,
  };
}
