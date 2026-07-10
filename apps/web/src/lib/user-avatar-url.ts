export function getUserAvatarPublicUrl(args: {
  baseUrl: string;
  userId: string;
  storageKey?: string | null;
}) {
  const base = `${args.baseUrl.replace(/\/$/, "")}/api/user-avatars/${args.userId}`;
  if (!args.storageKey?.startsWith("user-avatars/")) {
    return base;
  }

  const version = args.storageKey.split("/").pop()?.split(".")[0];
  return version ? `${base}?v=${version}` : base;
}
