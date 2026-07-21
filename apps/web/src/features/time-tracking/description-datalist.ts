import {
  normalizeSuggestionText,
  type DescriptionDatalistOption,
} from "@/features/time-tracking/description-suggestions";

function optionSearchText(option: DescriptionDatalistOption) {
  return normalizeSuggestionText(
    [option.description, option.taskTitle ?? "", option.projectName, option.clientName].join(" "),
  );
}

export function filterDescriptionDatalistOptions(
  options: DescriptionDatalistOption[],
  query: string,
): DescriptionDatalistOption[] {
  const normalized = normalizeSuggestionText(query);
  if (!normalized) return options;

  return options.filter((option) => optionSearchText(option).includes(normalized));
}
