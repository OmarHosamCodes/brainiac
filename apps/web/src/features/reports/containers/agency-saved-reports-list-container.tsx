import type {
  SavedReportListItem,
  SavedReportSearchContext,
} from "@/features/reports/agency-report-naming";
import { useSavedReportsListBody } from "../hooks/use-agency-saved-reports-list";
import {
  SavedReportsListBodyView,
  SavedReportsListSkeletonView,
} from "../agency-saved-reports-list-view";

export type SavedReportsListBodyContainerProps = {
  items: SavedReportListItem[];
  searchContext: SavedReportSearchContext;
  onSelect: (reportId: string) => void;
  searchable?: boolean;
  compact?: boolean;
};

export function SavedReportsListBodyContainer({
  items,
  searchContext,
  onSelect,
  searchable = true,
  compact = false,
}: SavedReportsListBodyContainerProps) {
  const vm = useSavedReportsListBody({ items, searchContext });
  return (
    <SavedReportsListBodyView
      items={items}
      onSelect={onSelect}
      searchable={searchable}
      compact={compact}
      vm={vm}
    />
  );
}

export function SavedReportsListSkeletonContainer() {
  return <SavedReportsListSkeletonView />;
}
