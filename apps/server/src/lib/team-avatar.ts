import { compressImage } from "@orch/api/image-compression";
import { getTeamAvatarStream, uploadTeamAvatarBuffer } from "@orch/api/storage";
import { createContext } from "@orch/api/context";
import { requireTeamMembership } from "@orch/api/lib/team-membership";
import { db } from "@orch/db";
import { workspaceTeam } from "@orch/db/schema";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";

export function registerTeamAvatarRoutes(app: Hono) {
  app.post("/uploads/team-avatar", async (c) => {
    const requestContext = await createContext({ context: c });
    const userId = requestContext.session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const teamIdValue = formData.get("teamId");
    const teamId = typeof teamIdValue === "string" ? teamIdValue.trim() : "";

    if (!teamId) {
      return c.json({ error: "teamId is required" }, 400);
    }

    try {
      await requireTeamMembership(userId, teamId, "owner");
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

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

    const { storageKey } = await uploadTeamAvatarBuffer({
      teamId,
      buffer: compressed.buffer,
      mimeType: compressed.mimeType,
    });

    return c.json({ storageKey }, 201);
  });

  app.get("/api/team-avatars/:teamId", async (c) => {
    const teamId = c.req.param("teamId");

    const [row] = await db
      .select({ image: workspaceTeam.image })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.id, teamId))
      .limit(1);

    if (!row?.image) {
      return c.notFound();
    }

    const storageKey = row.image;

    try {
      const { body, contentType, contentLength } = await getTeamAvatarStream(storageKey);
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
