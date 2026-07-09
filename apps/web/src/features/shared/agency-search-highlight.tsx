import { splitAgencySearchHighlight } from "@/features/shared/agency-list-search";
import { agencySearchHighlightMarkClass } from "@/features/shared/agency-ui";

type AgencySearchHighlightProps = {
  text: string;
  query: string;
  className?: string;
};

export function AgencySearchHighlight({ text, query, className }: AgencySearchHighlightProps) {
  const parts = splitAgencySearchHighlight(text, query);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={`${index}-${part.text}-${query}`}
            className={agencySearchHighlightMarkClass}
            style={{ animationDelay: `${index * 500}ms` }}
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${index}-${part.text}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
