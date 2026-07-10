type AttachmentMediaKind = "image" | "video" | "audio" | "document" | "archive" | "other" | "link";

type AttachmentMetadataLike =
  | {
      imageWidth?: number;
      imageHeight?: number;
      videoWidth?: number;
      videoHeight?: number;
      durationSeconds?: number;
      fileExtension?: string;
      lastModified?: string;
      mediaKind?: AttachmentMediaKind;
      sourceUrl?: string;
    }
  | null
  | undefined;

type AgencyAttachmentLike = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  url?: string | null;
  metadata?: AttachmentMetadataLike;
  storageKey?: string;
};

type AgencyAttachmentVariant = "grid" | "inline" | "list";

type AgencyAttachmentContext = "composer" | "message";

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "md",
  "json",
  "yaml",
  "yml",
]);

/** Files from a paste or drop clipboard/dataTransfer (screenshots often only appear on items). */
export function collectClipboardFiles(dataTransfer: DataTransfer | null | undefined): File[] {
  if (!dataTransfer) return [];

  const fromFiles = Array.from(dataTransfer.files).filter((file) => file.size > 0);
  if (fromFiles.length > 0) return fromFiles;

  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null && file.size > 0);
}

function getMediaKindFromMetadata(metadata: AttachmentMetadataLike): AttachmentMediaKind | null {
  if (!metadata?.mediaKind) return null;
  return metadata.mediaKind;
}

function isLinkAttachment(attachment: AgencyAttachmentLike): boolean {
  return (
    getMediaKindFromMetadata(attachment.metadata) === "link" ||
    attachment.mimeType === "text/uri-list" ||
    (attachment.storageKey?.startsWith("task-links/") ?? false)
  );
}

function isImageAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("image/") ||
    getMediaKindFromMetadata(attachment.metadata) === "image"
  );
}

function isVideoAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("video/") ||
    getMediaKindFromMetadata(attachment.metadata) === "video"
  );
}

function isAudioAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("audio/") ||
    getMediaKindFromMetadata(attachment.metadata) === "audio" ||
    attachment.durationSeconds != null
  );
}

function isDocumentAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  const kind = getMediaKindFromMetadata(attachment.metadata);
  if (kind === "document" || kind === "archive") return true;
  if (attachment.mimeType.includes("pdf")) return true;
  const ext = attachment.fileName.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_EXTENSIONS.has(ext);
}

export function selectAttachmentVariant(
  attachments: AgencyAttachmentLike[],
  context: AgencyAttachmentContext,
): AgencyAttachmentVariant {
  if (attachments.length === 0) return "inline";

  if (context === "composer") return "inline";

  const fileAttachments = attachments.filter((a) => !isAudioAttachment(a));
  if (fileAttachments.length === 0) return "inline";

  if (fileAttachments.length >= 4) return "list";

  const hasNonImage = fileAttachments.some((a) => !isImageAttachment(a) && !isVideoAttachment(a));
  const hasLinkOrDoc = fileAttachments.some((a) => isLinkAttachment(a) || isDocumentAttachment(a));

  if (hasLinkOrDoc) return "list";
  if (hasNonImage && fileAttachments.length >= 2) return "list";

  const allImages = fileAttachments.every((a) => isImageAttachment(a));
  if (allImages) return "grid";

  if (fileAttachments.length <= 3) return "inline";

  return "list";
}

const HTTPS_URL_PATTERN = /^https:\/\/[^\s/$.?#][^\s]*$/i;

export function normalizeAttachmentUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:") return null;
    if (!HTTPS_URL_PATTERN.test(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function deriveLinkLabel(url: string, label?: string): string {
  if (label?.trim()) return label.trim();
  try {
    const parsed = new URL(url);
    const path =
      parsed.pathname !== "/" && parsed.pathname.length > 1
        ? parsed.pathname.replace(/\/$/, "").slice(0, 48)
        : "";
    return path ? `${parsed.hostname}${path}` : parsed.hostname;
  } catch {
    return url.slice(0, 64);
  }
}
