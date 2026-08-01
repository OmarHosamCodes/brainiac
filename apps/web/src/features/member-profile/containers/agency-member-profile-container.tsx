import { AgencyMemberProfileView } from "@/features/member-profile/agency-member-profile-view";
import { useAgencyMemberProfile } from "@/features/member-profile/hooks/use-agency-member-profile";

type Props = {
  subjectUserId: string;
};

export function AgencyMemberProfileContainer({ subjectUserId }: Props) {
  const viewModel = useAgencyMemberProfile(subjectUserId);
  return <AgencyMemberProfileView viewModel={viewModel} />;
}
