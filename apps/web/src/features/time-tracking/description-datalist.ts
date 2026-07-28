import {
  rankDescriptionDatalistOptions,
  type DescriptionDatalistOption,
  type RankDescriptionSuggestionsContext,
} from "@/features/time-tracking/description-suggestions";

export function filterDescriptionDatalistOptions(
  options: DescriptionDatalistOption[],
  query: string,
  context?: Omit<RankDescriptionSuggestionsContext, "query">,
): DescriptionDatalistOption[] {
  return rankDescriptionDatalistOptions(options, { ...context, query });
}
