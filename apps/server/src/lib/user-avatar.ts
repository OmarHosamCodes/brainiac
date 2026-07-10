import { compressImage } from "@orch/api/image-compression";
import { getUserAvatarStream, uploadUserAvatarBuffer } from "@orch/api/storage";
import { createContext } from "@orch/api/context";
import { db } from "@orch/db";
import { user } from "@orch/db/schema";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";

export function registerUserAvatarRoutes(app: Hono) {
  app.post("/uploads/user-avatar", async (c) => {
    const requestContext = await createContext({ context: c });
    const userId = requestContext.session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return c.json({ error: "file is required" }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return c.json({ error: "Only image files are allowed" }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File size must be under 5MB" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressImage(buffer, file.type, { maxDimension: 512 });

    if (!compressed) {
      return c.json({ error: "Only image files are allowed" }, 400);
    }

    const { storageKey } = await uploadUserAvatarBuffer({
      userId,
      buffer: compressed.buffer,
      mimeType: compressed.mimeType,
    });

    return c.json({ storageKey }, 201);
  });

  app.get("/api/user-avatars/:userId", async (c) => {
    const userId = c.req.param("userId");

    const [row] = await db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!row?.image) {
      return c.notFound();
    }

    const storageKey = row.image;

    try {
      const { body, contentType, contentLength } = await getUserAvatarStream(storageKey);
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      };
      if (contentLength != null) {
        headers["Content-Length"] = String(contentLength);
      }
      return new Response(body, { status: 200, headers });
    } catch {
      return c.notFound();
    }
  });
}
