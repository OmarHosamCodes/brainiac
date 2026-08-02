import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { FiscalMonth } from "@/features/resourcing/tenure-utils";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export type PeopleExemptionItem = {
  id: string;
  fiscalYear: number;
  fiscalQuarter: number;
  type: string;
  userName: string | null;
  userId: string | null;
};

export type PeopleExemptionDraft = {
  type: "team_holiday" | "member_waiver" | "member_reduced_min" | "member_frozen_month";
  fiscalYear: string;
  fiscalQuarter: "1" | "2" | "3" | "4";
  userId: string;
  reducedMinHours: string;
  frozenMonth: FiscalMonth;
  reason: string;
};

type AgencyPeopleExemptionsProps = {
  exemptions: PeopleExemptionItem[];
  draft: PeopleExemptionDraft;
  onDraftChange: (draft: PeopleExemptionDraft) => void;
  canEdit: boolean;
  saving: boolean;
  onAdd: () => void;
  onRemove: (exemptionId: string) => void;
};

export function AgencyPeopleExemptions({
  exemptions,
  draft,
  onDraftChange,
  canEdit,
  saving,
  onAdd,
  onRemove,
}: AgencyPeopleExemptionsProps) {
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (saving) return;
    setFormOpen(false);
  }, [saving]);

  return (
    <div className="space-y-3 border-border border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-highlighted">Exemptions</h4>
          <p className={agencyWorkMetaClass}>
            Waivers and adjustments for this member, plus team-wide holidays.
          </p>
        </div>
        {canEdit ? (
          <Popover open={formOpen} onOpenChange={setFormOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" type="button">
                <Plus className="size-4" />
                Add exemption
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  onAdd();
                }}
              >
                <p className="text-sm font-bold text-highlighted">New exemption</p>
                <div className={agencyFormFieldClass}>
                  <Label className={agencyFormLabelClass}>Type</Label>
                  <Select
                    value={draft.type}
                    onValueChange={(value) =>
                      onDraftChange({
                        ...draft,
                        type: value as PeopleExemptionDraft["type"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_holiday">Team holiday quarter</SelectItem>
                      <SelectItem value="member_waiver">Member waiver</SelectItem>
                      <SelectItem value="member_reduced_min">Reduced minimum</SelectItem>
                      <SelectItem value="member_frozen_month">Frozen month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={agencyFormFieldClass}>
                    <Label className={agencyFormLabelClass}>Fiscal year</Label>
                    <Input
                      type="number"
                      value={draft.fiscalYear}
                      onChange={(event) =>
                        onDraftChange({ ...draft, fiscalYear: event.target.value })
                      }
                    />
                  </div>
                  <div className={agencyFormFieldClass}>
                    <Label className={agencyFormLabelClass}>Quarter</Label>
                    <Select
                      value={draft.fiscalQuarter}
                      onValueChange={(value) =>
                        onDraftChange({
                          ...draft,
                          fiscalQuarter: value as PeopleExemptionDraft["fiscalQuarter"],
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {draft.type === "member_reduced_min" ? (
                  <div className={agencyFormFieldClass}>
                    <Label className={agencyFormLabelClass}>Reduced min hours</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.reducedMinHours}
                      onChange={(event) =>
                        onDraftChange({ ...draft, reducedMinHours: event.target.value })
                      }
                    />
                  </div>
                ) : null}
                {draft.type === "member_frozen_month" ? (
                  <div className={agencyFormFieldClass}>
                    <Label className={agencyFormLabelClass}>Frozen month</Label>
                    <Select
                      value={String(draft.frozenMonth)}
                      onValueChange={(value) =>
                        onDraftChange({
                          ...draft,
                          frozenMonth: Number.parseInt(value, 10) as FiscalMonth,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, index) => {
                          const month = (index + 1) as FiscalMonth;
                          return (
                            <SelectItem key={month} value={String(month)}>
                              {month}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className={agencyFormFieldClass}>
                  <Label className={agencyFormLabelClass}>Reason</Label>
                  <Input
                    value={draft.reason}
                    onChange={(event) => onDraftChange({ ...draft, reason: event.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving…" : "Save exemption"}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {exemptions.length > 0 ? (
        <ul className="space-y-2">
          {exemptions.map((exemption) => (
            <li
              key={exemption.id}
              className="border-border flex items-start justify-between gap-2 rounded-xl border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-highlighted">
                  FY{String(exemption.fiscalYear).slice(-2)} Q{exemption.fiscalQuarter} ·{" "}
                  {exemption.type.replaceAll("_", " ")}
                </p>
                {exemption.type === "team_holiday" ? (
                  <p className={agencyWorkMetaClass}>Team-wide</p>
                ) : null}
              </div>
              {canEdit && exemption.type !== "team_holiday" ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove exemption"
                  onClick={() => onRemove(exemption.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={agencyWorkMetaClass}>No exemptions for this member.</p>
      )}
    </div>
  );
}
