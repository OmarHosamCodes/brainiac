import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isAgencyReportFieldId,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  AGENCY_REPORT_SHOW_WASTE_LABELS,
  AGENCY_REPORT_SHOW_WASTE_SOURCES,
  type AgencyReportShowWaste,
  type AgencyReportShowWasteSource,
} from "@/features/reports/agency-report-show-waste";
import { AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL } from "@/features/reports/agency-report-merge-tasks";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const filterOptionButtonClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export type AgencyReportViewOptionsProps = {
  fieldIds: AgencyReportFieldId[];
  onFieldIdsChange: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds?: AgencyReportFieldId[];
  showWaste: AgencyReportShowWaste;
  onShowWasteChange: (showWaste: AgencyReportShowWaste) => void;
  mergeSameTaskNames: boolean;
  onMergeSameTaskNamesChange: (mergeSameTaskNames: boolean) => void;
};

export function AgencyReportViewOptions({
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds = allAgencyReportFieldIds(),
  showWaste,
  onShowWasteChange,
  mergeSameTaskNames,
  onMergeSameTaskNamesChange,
}: AgencyReportViewOptionsProps) {
  const [open, setOpen] = useState(false);
  const allFieldsSelected = areSameReportFieldSets(fieldIds, defaultFieldIds);
  const someFieldsSelected = fieldIds.length > 0 && !allFieldsSelected;
  const allWasteSelected = AGENCY_REPORT_SHOW_WASTE_SOURCES.every((source) => showWaste[source]);
  const someWasteSelected =
    !allWasteSelected && AGENCY_REPORT_SHOW_WASTE_SOURCES.some((source) => showWaste[source]);

  function toggleField(field: AgencyReportFieldId, enabled: boolean) {
    const next = enabled
      ? [...new Set([...fieldIds, field])]
      : fieldIds.filter((value) => value !== field);
    onFieldIdsChange(next.filter(isAgencyReportFieldId));
  }

  function toggleAllFields(enabled: boolean) {
    onFieldIdsChange(enabled ? defaultFieldIds : []);
  }

  function toggleShowWaste(source: AgencyReportShowWasteSource, enabled: boolean) {
    onShowWasteChange({ ...showWaste, [source]: enabled });
  }

  function toggleAllWaste(enabled: boolean) {
    onShowWasteChange({
      projects: enabled,
      tasks: enabled,
      entries: enabled,
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Report view"
          title="Choose columns, waste, and merge"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Report view
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(filterOptionButtonClass, "data-open:bg-default/80")}
          >
            <span className="min-w-0 flex-1 truncate">Fields</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
            <div
              className="flex flex-col gap-0.5"
              onPointerDown={(event) => event.preventDefault()}
            >
              <label
                className={cn(
                  filterOptionButtonClass,
                  "justify-start gap-2.5",
                  allFieldsSelected && "bg-primary/10 text-primary",
                )}
              >
                <Checkbox
                  checked={someFieldsSelected ? "indeterminate" : allFieldsSelected}
                  className="size-3.5"
                  aria-label="Select all fields"
                  onCheckedChange={(next) => toggleAllFields(next === true)}
                />
                <span className="min-w-0 flex-1 truncate">Select all</span>
              </label>

              {defaultFieldIds.map((field) => {
                const checked = fieldIds.includes(field);
                return (
                  <label
                    key={field}
                    className={cn(
                      filterOptionButtonClass,
                      "justify-start gap-2.5",
                      checked && "bg-primary/10 text-primary",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="size-3.5"
                      aria-label={AGENCY_REPORT_FIELD_LABELS[field]}
                      onCheckedChange={(next) => toggleField(field, next === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {AGENCY_REPORT_FIELD_LABELS[field]}
                    </span>
                  </label>
                );
              })}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(filterOptionButtonClass, "data-open:bg-default/80")}
          >
            <span className="min-w-0 flex-1 truncate">Show waste</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
            <div
              className="flex flex-col gap-0.5"
              onPointerDown={(event) => event.preventDefault()}
            >
              <label
                className={cn(
                  filterOptionButtonClass,
                  "justify-start gap-2.5",
                  allWasteSelected && "bg-primary/10 text-primary",
                )}
              >
                <Checkbox
                  checked={someWasteSelected ? "indeterminate" : allWasteSelected}
                  className="size-3.5"
                  aria-label="Select all waste"
                  onCheckedChange={(next) => toggleAllWaste(next === true)}
                />
                <span className="min-w-0 flex-1 truncate">Select all</span>
              </label>

              {AGENCY_REPORT_SHOW_WASTE_SOURCES.map((source) => {
                const checked = showWaste[source];
                return (
                  <label
                    key={source}
                    className={cn(
                      filterOptionButtonClass,
                      "justify-start gap-2.5",
                      checked && "bg-primary/10 text-primary",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="size-3.5"
                      aria-label={AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
                      onCheckedChange={(next) => toggleShowWaste(source, next === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
                    </span>
                  </label>
                );
              })}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <label
          className={cn(
            filterOptionButtonClass,
            "justify-start gap-2.5",
            mergeSameTaskNames && "bg-primary/10 text-primary",
          )}
          onPointerDown={(event) => event.preventDefault()}
        >
          <Checkbox
            checked={mergeSameTaskNames}
            className="size-3.5"
            aria-label={AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
            onCheckedChange={(next) => onMergeSameTaskNamesChange(next === true)}
          />
          <span className="min-w-0 flex-1 truncate">
            {AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
          </span>
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
