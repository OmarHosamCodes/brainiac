import type {
  AgentModelContentPart,
  AgentTextAttachment,
  AgentTextAttachmentMediaType,
} from "./types";

const FENCE_BY_MEDIA_TYPE: Partial<Record<AgentTextAttachmentMediaType, string>> = {
  "text/plain": "text",
  "text/markdown": "markdown",
  "application/json": "json",
};

export type { AgentModelContentPart };

export function isImageAttachmentMediaType(mediaType: string): boolean {
  return mediaType.startsWith("image/");
}

export function composeAgentTurnUserContent(
  content: string,
  attachments: AgentTextAttachment[] = [],
): string {
  const draft = content.trim();
  const blocks = attachments
    .filter((attachment) => !isImageAttachmentMediaType(attachment.mediaType))
    .map((attachment) => {
      const fence = FENCE_BY_MEDIA_TYPE[attachment.mediaType] ?? "text";
      return `Attached file: ${attachment.filename}\n\`\`\`${fence}\n${attachment.text}\n\`\`\``;
    });

  return [draft, ...blocks].filter((part) => part.length > 0).join("\n\n");
}

/** Builds OpenRouter EasyInputMessage content (string or multimodal parts). */
export function buildAgentModelUserContent(
  content: string,
  attachments: AgentTextAttachment[] = [],
): string | AgentModelContentPart[] {
  const textAttachments = attachments.filter(
    (attachment) => !isImageAttachmentMediaType(attachment.mediaType),
  );
  const imageAttachments = attachments.filter((attachment) =>
    isImageAttachmentMediaType(attachment.mediaType),
  );
  const textBody = composeAgentTurnUserContent(content, textAttachments);

  if (imageAttachments.length === 0) {
    return textBody;
  }

  const parts: AgentModelContentPart[] = [
    {
      type: "input_text",
      text: textBody || "Please review the attached image(s).",
    },
  ];

  for (const image of imageAttachments) {
    parts.push({
      type: "input_image",
      imageUrl: image.text,
      detail: "auto",
    });
  }

  return parts;
}

export function titleSeedFromAgentTurn(
  content: string,
  attachments: AgentTextAttachment[] = [],
): string {
  const draft = content.trim();
  if (draft) return draft;
  return attachments[0]?.filename?.trim() || "";
}

export function modelContentLength(content: string | AgentModelContentPart[]): number {
  if (typeof content === "string") return content.length;
  return content.reduce((total, part) => {
    if (part.type === "input_text") return total + part.text.length;
    return total + Math.min(part.imageUrl.length, 8_000);
  }, 0);
}
