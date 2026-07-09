import { getUserAvatarPublicUrl } from "../../../storage";
import { env } from "@brainiac/env/server";

export const AVATAR_KEY_PREFIX = "user-avatars/";

export function formatAvatarUrl(image: string | null): string | null {
  if (!image || !image.startsWith(AVATAR_KEY_PREFIX)) return image;
  const parts = image.split("/");
  const userId = parts[1];
  if (!userId) return null;
  return getUserAvatarPublicUrl({
    baseUrl: env.BETTER_AUTH_URL,
    userId,
    storageKey: image,
  });
}
