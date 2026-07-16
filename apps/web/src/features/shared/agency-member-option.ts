export type AgencyMemberOption = {
  userId: string;
  userName: string;
  userAvatar: string | null;
};

export function toAgencyMemberOption(member: {
  userId: string;
  userName: string;
  image?: string | null;
  userAvatar?: string | null;
}): AgencyMemberOption {
  return {
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.userAvatar ?? member.image ?? null,
  };
}
