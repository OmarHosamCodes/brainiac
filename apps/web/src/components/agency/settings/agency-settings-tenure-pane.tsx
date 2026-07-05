import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AgencySettingsTenureMemberDetail,
  type TenureExemptionDraft,
  type TenureProfileDraft,
} from "@/components/agency/settings/agency-settings-tenure-member-detail";
import {
  AgencySettingsTenurePolicy,
  type TenurePolicyDraft,
} from "@/components/agency/settings/agency-settings-tenure-policy";
import { AgencySettingsTenureRoster } from "@/components/agency/settings/agency-settings-tenure-roster";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import type { FiscalMonth } from "@/lib/tenure-utils";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { agencySectionTitleClass } from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencySettingsTenurePaneProps = {
  teamId: string;
  active: boolean;
};

export function AgencySettingsTenurePane({ teamId, active }: AgencySettingsTenurePaneProps) {
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const isOwner = teamQuery.data?.role === "owner";

  const policyQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const summaryQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.summary.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const exemptionsQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.exemptions.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && active,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const policy = policyQuery.data?.policy ?? null;
  const members = summaryQuery.data?.items ?? [];
  const policyEnabled = summaryQuery.data?.policyEnabled ?? false;
  const exemptions = exemptionsQuery.data?.items ?? [];

  const [policyDraft, setPolicyDraft] = useState<TenurePolicyDraft>({
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: "1",
    quarterlyMinHours: "525",
    penaltyMonths: "6",
    internDurationMonths: "4",
    internDurationWeeks: "0",
    policyEffectiveFrom: new Date().toISOString().slice(0, 10),
    enabled: false,
  });

  useEffect(() => {
    if (!policy) return;
    setPolicyDraft({
      fiscalYearStartMonth: policy.fiscalYearStartMonth as FiscalMonth,
      fiscalYearStartDay: String(policy.fiscalYearStartDay),
      quarterlyMinHours: String(policy.quarterlyMinHours),
      penaltyMonths: String(policy.penaltyMonths),
      internDurationMonths: String(policy.internDurationMonths),
      internDurationWeeks: String(policy.internDurationWeeks),
      policyEffectiveFrom: policy.policyEffectiveFrom.slice(0, 10),
      enabled: policy.enabled,
    });
  }, [policy]);

  const savePolicyMutation = useMutation(orpc.agencyOps.tenure.policy.upsert.mutationOptions());
  const saveProfileMutation = useMutation(orpc.agencyOps.tenure.profiles.upsert.mutationOptions());
  const saveExemptionMutation = useMutation(
    orpc.agencyOps.tenure.exemptions.upsert.mutationOptions(),
  );
  const deleteExemptionMutation = useMutation(
    orpc.agencyOps.tenure.exemptions.delete.mutationOptions(),
  );

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const memberDetailQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.member.get.queryOptions({
          input: { teamId, userId: selectedUserId ?? "" },
        }),
        enabled: Boolean(teamId && selectedUserId && active),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const memberDetail = memberDetailQuery.data?.member ?? null;

  const selectedMemberName = useMemo(() => {
    if (!selectedUserId) return "";
    return members.find((member) => member.userId === selectedUserId)?.userName ?? "Member";
  }, [members, selectedUserId]);

  const [profileDraft, setProfileDraft] = useState<TenureProfileDraft>({
    internStart: "",
    internEnd: "",
    internCountsTowardTenure: false,
    internExemptFromQuarterMin: true,
    notes: "",
  });

  useEffect(() => {
    if (!memberDetail) return;
    setProfileDraft({
      internStart: memberDetail.internStart?.slice(0, 10) ?? "",
      internEnd: memberDetail.internEnd?.slice(0, 10) ?? "",
      internCountsTowardTenure: memberDetail.internCountsTowardTenure,
      internExemptFromQuarterMin: memberDetail.internExemptFromQuarterMin,
      notes: memberDetail.notes ?? "",
    });
  }, [memberDetail]);

  const [exemptionDraft, setExemptionDraft] = useState<TenureExemptionDraft>({
    type: "member_waiver",
    fiscalYear: String(new Date().getUTCFullYear()),
    fiscalQuarter: "1",
    userId: "",
    reducedMinHours: "",
    frozenMonth: 1,
    reason: "",
  });

  async function invalidateTenureQueries() {
    if (!teamId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.policy.get.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.summary.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.exemptions.list.key({ input: { teamId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.profiles.list.key({ input: { teamId } }),
      }),
    ]);
    if (selectedUserId) {
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.tenure.member.get.key({
          input: { teamId, userId: selectedUserId },
        }),
      });
    }
  }

  async function savePolicy() {
    if (!teamId || !isOwner) return;
    try {
      await savePolicyMutation.mutateAsync({
        teamId,
        fiscalYearStartMonth: policyDraft.fiscalYearStartMonth,
        fiscalYearStartDay: Number.parseInt(policyDraft.fiscalYearStartDay, 10),
        quarterlyMinHours: Number.parseInt(policyDraft.quarterlyMinHours, 10),
        penaltyMonths: Number.parseInt(policyDraft.penaltyMonths, 10),
        internDurationMonths: Number.parseInt(policyDraft.internDurationMonths, 10),
        internDurationWeeks: Number.parseInt(policyDraft.internDurationWeeks, 10),
        policyEffectiveFrom: new Date(policyDraft.policyEffectiveFrom).toISOString(),
        enabled: policyDraft.enabled,
      });
      await invalidateTenureQueries();
      toast.success("Tenure policy saved");
    } catch (error) {
      toast.error("Couldn't save policy", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  const memberExemptions = useMemo(() => {
    if (!selectedUserId) return [];
    return exemptions.filter(
      (exemption) => exemption.type === "team_holiday" || exemption.userId === selectedUserId,
    );
  }, [exemptions, selectedUserId]);

  async function saveProfile() {
    if (!teamId || !isOwner || !selectedUserId) return;
    try {
      await saveProfileMutation.mutateAsync({
        teamId,
        userId: selectedUserId,
        internStart: profileDraft.internStart
          ? new Date(profileDraft.internStart).toISOString()
          : null,
        internEnd: profileDraft.internEnd ? new Date(profileDraft.internEnd).toISOString() : null,
        internCountsTowardTenure: profileDraft.internCountsTowardTenure,
        internExemptFromQuarterMin: profileDraft.internExemptFromQuarterMin,
        notes: profileDraft.notes || null,
      });
      await invalidateTenureQueries();
      toast.success("Member profile saved");
    } catch (error) {
      toast.error("Couldn't save profile", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  async function addExemption() {
    if (!teamId || !isOwner) return;
    try {
      const type = exemptionDraft.type;
      await saveExemptionMutation.mutateAsync({
        teamId,
        type,
        fiscalYear: Number.parseInt(exemptionDraft.fiscalYear, 10),
        fiscalQuarter: Number.parseInt(exemptionDraft.fiscalQuarter, 10) as 1 | 2 | 3 | 4,
        userId: type === "team_holiday" ? null : exemptionDraft.userId || selectedUserId,
        reducedMinHours:
          type === "member_reduced_min"
            ? Number.parseInt(exemptionDraft.reducedMinHours, 10)
            : null,
        frozenMonth: type === "member_frozen_month" ? exemptionDraft.frozenMonth : null,
        reason: exemptionDraft.reason || null,
      });
      await invalidateTenureQueries();
      toast.success("Exemption saved");
    } catch (error) {
      toast.error("Couldn't save exemption", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  async function removeExemption(exemptionId: string) {
    if (!teamId || !isOwner) return;
    try {
      await deleteExemptionMutation.mutateAsync({ teamId, exemptionId });
      await invalidateTenureQueries();
      toast.success("Exemption removed");
    } catch (error) {
      toast.error("Couldn't remove exemption", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  const fiscalYearPreview = useMemo(() => {
    const month = policyDraft.fiscalYearStartMonth;
    const day = Number.parseInt(policyDraft.fiscalYearStartDay, 10) || 1;
    const year = new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, month - 1, day));
    const endExclusive = new Date(Date.UTC(year + 1, month - 1, day));
    endExclusive.setUTCDate(endExclusive.getUTCDate() - 1);
    const fmt = (date: Date) =>
      date.toLocaleDateString(undefined, {
        timeZone: "UTC",
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
    return `Example fiscal year: ${fmt(start)} – ${fmt(endExclusive)} (UTC).`;
  }, [policyDraft.fiscalYearStartDay, policyDraft.fiscalYearStartMonth]);

  const isLoading = policyQuery.isPending || summaryQuery.isPending || teamQuery.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h2 className={agencySectionTitleClass}>Agency tenure and quarterly hour requirements</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          <AgencySettingsTenurePolicy
            policyDraft={policyDraft}
            onPolicyDraftChange={setPolicyDraft}
            isOwner={isOwner}
            fiscalYearPreview={fiscalYearPreview}
            saving={savePolicyMutation.isPending}
            onSave={() => void savePolicy()}
          />

          {selectedUserId ? (
            <AgencySettingsTenureMemberDetail
              memberName={selectedMemberName}
              memberDetail={memberDetail}
              loading={memberDetailQuery.isPending}
              isOwner={isOwner}
              exemptions={memberExemptions}
              profileDraft={profileDraft}
              onProfileDraftChange={setProfileDraft}
              exemptionDraft={exemptionDraft}
              onExemptionDraftChange={setExemptionDraft}
              savingProfile={saveProfileMutation.isPending}
              savingExemption={saveExemptionMutation.isPending}
              onClose={() => setSelectedUserId(null)}
              onSaveProfile={() => void saveProfile()}
              onAddExemption={() => void addExemption()}
              onRemoveExemption={(exemptionId) => void removeExemption(exemptionId)}
            />
          ) : (
            <AgencySettingsTenureRoster
              members={members}
              policyEnabled={policyEnabled}
              onSelect={setSelectedUserId}
            />
          )}
        </>
      )}
    </div>
  );
}
