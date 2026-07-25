const DICEBEAR_GLYPHS_BASE = "https://api.dicebear.com/10.x/glyphs/svg";

/** Stable DiceBear Glyphs fallback for missing or failed person avatars. */
export function getDicebearGlyphAvatarUrl(seed: string): string {
  const value = seed.trim() || "orch";
  return `${DICEBEAR_GLYPHS_BASE}?seed=${encodeURIComponent(value)}`;
}
