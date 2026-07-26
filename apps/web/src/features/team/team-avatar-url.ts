export function getTeamAvatarPublicUrl(args: {
  baseUrl: string;
  teamId: string;
  storageKey?: string | null;
}) {
  const base = `${args.baseUrl.replace(/\/$/, "")}/api/team-avatars/${args.teamId}`;
  if (!args.storageKey?.startsWith("team-avatars/")) {
    return base;
  }

  const version = args.storageKey.split("/").pop()?.split(".")[0];
  return version ? `${base}?v=${version}` : base;
}
