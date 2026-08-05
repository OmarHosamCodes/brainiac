/** Contact completeness for Clients list / commercial hub cues. */

export type ClientContactFields = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ClientContactCompleteness = "missing" | "partial" | "complete";

export function clientContactCompleteness(
  contact: ClientContactFields | null | undefined,
): ClientContactCompleteness {
  if (!contact) return "missing";
  const name = Boolean(contact.name?.trim());
  const email = Boolean(contact.email?.trim());
  const phone = Boolean(contact.phone?.trim());
  const filled = Number(name) + Number(email) + Number(phone);
  if (filled === 0) return "missing";
  if (filled === 3) return "complete";
  return "partial";
}

export function clientContactCompletenessLabel(level: ClientContactCompleteness): string {
  switch (level) {
    case "missing":
      return "No contact";
    case "partial":
      return "Partial";
    case "complete":
      return "Complete";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}
