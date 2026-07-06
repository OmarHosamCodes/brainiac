import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { compressImage, replaceFileExtension } from "./image-compression";

describe("compressImage", () => {
  test("compresses a large PNG to smaller WebP with capped dimensions", async () => {
    const source = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 120, g: 80, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(source, "image/png", { maxDimension: 2560 });

    expect(result).not.toBeNull();
    expect(result!.changed).toBe(true);
    expect(result!.mimeType).toBe("image/webp");
    expect(result!.buffer.byteLength).toBeLessThan(source.byteLength);
    expect(result!.width).toBeLessThanOrEqual(2560);
    expect(result!.height).toBeLessThanOrEqual(2560);
  });

  test("returns original when WebP would be larger", async () => {
    const source = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .webp({ quality: 60 })
      .toBuffer();

    const result = await compressImage(source, "image/webp", { maxDimension: 2560 });

    expect(result).not.toBeNull();
    expect(result!.changed).toBe(false);
    expect(result!.mimeType).toBe("image/webp");
    expect(result!.buffer).toEqual(source);
  });

  test("returns null for non-images and skipped formats", async () => {
    const buffer = Buffer.from("not-an-image");

    expect(await compressImage(buffer, "application/pdf")).toBeNull();
    expect(await compressImage(buffer, "image/gif")).toBeNull();
    expect(await compressImage(buffer, "image/svg+xml")).toBeNull();
    expect(await compressImage(buffer, "image/png")).toBeNull();
  });
});

describe("replaceFileExtension", () => {
  test("replaces extension", () => {
    expect(replaceFileExtension("photo.JPG", "webp")).toBe("photo.webp");
    expect(replaceFileExtension("noext", "webp")).toBe("noext.webp");
  });
});
