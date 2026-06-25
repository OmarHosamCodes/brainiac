type AgencyTaskMediaPlayerProps = {
  src: string | null | undefined;
  mimeType: string;
  fileName?: string;
  compact?: boolean;
  mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other" | null;
};

function isHlsSource(src: string, mimeType: string): boolean {
  const normalizedSource = src.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  const normalizedMimeType = mimeType.toLowerCase();

  return (
    normalizedSource.endsWith(".m3u8") ||
    normalizedMimeType === "application/vnd.apple.mpegurl" ||
    normalizedMimeType === "application/x-mpegurl"
  );
}

export function AgencyTaskMediaPlayer({
  src,
  mimeType,
  fileName,
  compact = false,
  mediaKind,
}: AgencyTaskMediaPlayerProps) {
  const source = src ?? "";
  const label = fileName ?? "Task attachment";

  if (!source) {
    return null;
  }

  const hls = isHlsSource(source, mimeType);
  const isAudio = (mediaKind === "audio" || mimeType.startsWith("audio/")) && !hls;
  const isVideo = !isAudio && (mimeType.startsWith("video/") || hls);

  return (
    <div className={["agency-task-media-player w-full", compact ? "is-compact" : ""].join(" ")}>
      {isAudio ? (
        <audio
          src={source}
          aria-label={label}
          preload="metadata"
          controls
          className="w-full max-w-sm"
        />
      ) : isVideo ? (
        <video
          src={source}
          aria-label={label}
          preload="metadata"
          playsInline
          controls
          className="w-full max-w-xl rounded-lg"
        />
      ) : null}
    </div>
  );
}
