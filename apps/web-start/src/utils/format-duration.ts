export function formatDuration(seconds: number, style: "clock" | "short" = "clock") {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3_600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3_600) / 60)
    .toString()
    .padStart(2, "0");

  if (style === "short") {
    return `${hours}:${minutes}`;
  }

  const secs = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}
