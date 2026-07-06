import sharp from "sharp";

const WEBP_MIME = "image/webp";
const WEBP_QUALITY = 80;

// ponytail: GIF/SVG skipped — animation loss / SVG rasterization; audio/docs already compressed
const SKIP_MIME_PREFIXES = ["image/gif", "image/svg"];

export type CompressedImage = {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  changed: boolean;
};

export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  opts: { maxDimension?: number } = {},
): Promise<CompressedImage | null> {
  if (!mimeType.startsWith("image/")) {
    return null;
  }

  if (SKIP_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
    return null;
  }

  const maxDimension = opts.maxDimension ?? 2560;

  try {
    const pipeline = sharp(buffer).rotate().resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });

    const webpBuffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    const { width = 0, height = 0 } = await sharp(webpBuffer).metadata();

    if (webpBuffer.byteLength >= buffer.byteLength) {
      const originalMeta = await sharp(buffer).metadata();
      return {
        buffer,
        mimeType,
        width: originalMeta.width ?? 0,
        height: originalMeta.height ?? 0,
        changed: false,
      };
    }

    return {
      buffer: webpBuffer,
      mimeType: WEBP_MIME,
      width,
      height,
      changed: true,
    };
  } catch {
    return null;
  }
}

export function replaceFileExtension(fileName: string, extension: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${base}.${extension}`;
}
