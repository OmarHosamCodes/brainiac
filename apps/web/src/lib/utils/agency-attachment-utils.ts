import { assertNever } from "@brainiac/config/assert-never";
import type { LucideIcon } from "lucide-react";
import { File, FileText, Globe, Image, Music, Video } from "lucide-react";

export type AttachmentMediaKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other"
  | "link";

export type AttachmentMetadataLike =
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

export type AgencyAttachmentLike = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  url?: string | null;
  metadata?: AttachmentMetadataLike;
  storageKey?: string;
};

export type AgencyAttachmentVariant = "grid" | "inline" | "list";

export type AgencyAttachmentContext = "composer" | "message";

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

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.yaml,.yml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const AGENCY_ATTACHMENT_IMAGE_ACCEPT = "image/*";
export const AGENCY_ATTACHMENT_DOCUMENT_ACCEPT = DOCUMENT_ACCEPT;

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

export function getMediaKindFromMetadata(
  metadata: AttachmentMetadataLike,
): AttachmentMediaKind | null {
  if (!metadata?.mediaKind) return null;
  return metadata.mediaKind;
}

export function isLinkAttachment(attachment: AgencyAttachmentLike): boolean {
  return (
    getMediaKindFromMetadata(attachment.metadata) === "link" ||
    attachment.mimeType === "text/uri-list" ||
    (attachment.storageKey?.startsWith("task-links/") ?? false)
  );
}

export function isImageAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("image/") ||
    getMediaKindFromMetadata(attachment.metadata) === "image"
  );
}

export function isVideoAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("video/") ||
    getMediaKindFromMetadata(attachment.metadata) === "video"
  );
}

export function isAudioAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  return (
    attachment.mimeType.startsWith("audio/") ||
    getMediaKindFromMetadata(attachment.metadata) === "audio" ||
    attachment.durationSeconds != null
  );
}

export function isDocumentAttachment(attachment: AgencyAttachmentLike): boolean {
  if (isLinkAttachment(attachment)) return false;
  const kind = getMediaKindFromMetadata(attachment.metadata);
  if (kind === "document" || kind === "archive") return true;
  if (attachment.mimeType.includes("pdf")) return true;
  const ext = attachment.fileName.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_EXTENSIONS.has(ext);
}

export function getAttachmentMediaKind(attachment: AgencyAttachmentLike): AttachmentMediaKind {
  if (isLinkAttachment(attachment)) return "link";
  const fromMeta = getMediaKindFromMetadata(attachment.metadata);
  if (fromMeta) return fromMeta;
  if (isImageAttachment(attachment)) return "image";
  if (isAudioAttachment(attachment)) return "audio";
  if (isVideoAttachment(attachment)) return "video";
  if (isDocumentAttachment(attachment)) return "document";
  return "other";
}

export function getAttachmentIcon(attachment: AgencyAttachmentLike): LucideIcon {
  const kind = getAttachmentMediaKind(attachment);
  switch (kind) {
    case "link":
      return Globe;
    case "image":
      return Image;
    case "audio":
      return Music;
    case "video":
      return Video;
    case "document":
      return FileText;
    case "archive":
    case "other":
      return File;
    default:
      return assertNever(kind);
  }
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentUrl(attachment: AgencyAttachmentLike): string | null {
  if (isLinkAttachment(attachment)) {
    return attachment.metadata?.sourceUrl ?? attachment.url ?? null;
  }
  return attachment.url ?? null;
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
