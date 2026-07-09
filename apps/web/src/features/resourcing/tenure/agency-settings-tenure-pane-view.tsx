import { AgencySettingsTenureMemberDetail } from "@/features/resourcing/tenure/agency-settings-tenure-member-detail";
import { AgencySettingsTenurePolicy } from "@/features/resourcing/tenure/agency-settings-tenure-policy";
import { AgencySettingsTenureRoster } from "@/features/resourcing/tenure/agency-settings-tenure-roster";
import { Skeleton } from "@/ui/skeleton";
import { agencySectionTitleClass } from "@/features/shared/agency-ui";
import { type AgencySettingsTenurePaneViewModel } from "./hooks/use-agency-settings-tenure-pane";

type AgencySettingsTenurePaneViewProps = {
  viewModel: AgencySettingsTenurePaneViewModel;
};

export function AgencySettingsTenurePaneView({ viewModel }: AgencySettingsTenurePaneViewProps) {
  const {
    isLoading,
    isOwner,
    policyDraft,
    setPolicyDraft,
    fiscalYearPreview,
    savingPolicy,
    savePolicy,
    selectedUserId,
    setSelectedUserId,
    selectedMemberName,
    memberDetail,
    loadingMemberDetail,
    memberExemptions,
    profileDraft,
    setProfileDraft,
    exemptionDraft,
    setExemptionDraft,
    savingProfile,
    savingExemption,
    saveProfile,
    addExemption,
    removeExemption,
    members,
    policyEnabled,
  } = viewModel;

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
            saving={savingPolicy}
            onSave={savePolicy}
          />

          {selectedUserId ? (
            <AgencySettingsTenureMemberDetail
              memberName={selectedMemberName}
              memberDetail={memberDetail}
              loading={loadingMemberDetail}
              isOwner={isOwner}
              exemptions={memberExemptions}
              profileDraft={profileDraft}
              onProfileDraftChange={setProfileDraft}
              exemptionDraft={exemptionDraft}
              onExemptionDraftChange={setExemptionDraft}
              savingProfile={savingProfile}
              savingExemption={savingExemption}
              onClose={() => setSelectedUserId(null)}
              onSaveProfile={saveProfile}
              onAddExemption={addExemption}
              onRemoveExemption={removeExemption}
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
