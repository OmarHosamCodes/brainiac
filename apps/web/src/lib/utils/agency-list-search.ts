export type AgencySearchHighlightPart = {
  text: string;
  match: boolean;
};

export function normalizeAgencySearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function agencyListSearchMatches(term: string, ...fields: string[]): boolean {
  const normalized = normalizeAgencySearchTerm(term);
  if (!normalized) return true;
  return fields.some((field) => field.toLowerCase().includes(normalized));
}

export function splitAgencySearchHighlight(
  text: string,
  query: string,
): AgencySearchHighlightPart[] {
  const normalized = normalizeAgencySearchTerm(query);
  if (!normalized) return [{ text, match: false }];

  const lowerText = text.toLowerCase();
  const parts: AgencySearchHighlightPart[] = [];
  let start = 0;

  while (start < text.length) {
    const index = lowerText.indexOf(normalized, start);
    if (index === -1) {
      parts.push({ text: text.slice(start), match: false });
      break;
    }
    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false });
    }
    parts.push({ text: text.slice(index, index + normalized.length), match: true });
    start = index + normalized.length;
  }

  return parts.length > 0 ? parts : [{ text, match: false }];
}
