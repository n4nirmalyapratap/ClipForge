import { Router } from "express";
import { db } from "@workspace/db";
import { clipsTable, jobsTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import path from "path";
import {
  ListClipsQueryParams,
  GetClipParams,
  UpdateClipParams,
  UpdateClipBody,
  DeleteClipParams,
  UploadClipParams,
  UploadClipBody,
} from "@workspace/api-zod";
import { uploadToYouTube, uploadToInstagram, uploadToTikTok } from "../../lib/video/uploader";
import { generateClickbaitThumbnail } from "../../lib/video/clipper";
import { accountsTable } from "@workspace/db";

const DOWNLOADS_DIR = path.resolve(process.cwd(), "downloads");

/** Convert an absolute filesystem path to a /api/media/ URL */
function toMediaUrl(absPath: string | null): string | null {
  if (!absPath) return null;
  const rel = path.relative(DOWNLOADS_DIR, absPath);
  return `/api/media/${rel.replace(/\\/g, "/")}`;
}

function formatClip(c: any) {
  return {
    ...c,
    filePath: toMediaUrl(c.filePath),
    thumbnailPath: toMediaUrl(c.thumbnailPath),
    uploadedPlatforms: JSON.parse(c.uploadedPlatforms || "[]"),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

const router = Router();

// List all clips
router.get("/clips", async (req, res) => {
  try {
    const query = ListClipsQueryParams.safeParse(req.query);
    let clips = await db.select().from(clipsTable).orderBy(desc(clipsTable.createdAt));

    if (query.success && query.data.status) {
      clips = clips.filter((c) => c.status === query.data.status);
    }

    res.json(clips.map(formatClip));
  } catch (err) {
    req.log.error({ err }, "Failed to list clips");
    res.status(500).json({ error: "Failed to list clips" });
  }
});

// Get clips for a specific job
router.get("/jobs/:jobId/clips", async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid jobId" });

    const clips = await db.select().from(clipsTable).where(eq(clipsTable.jobId, jobId)).orderBy(desc(clipsTable.aiScore));

    res.json(clips.map(formatClip));
  } catch (err) {
    req.log.error({ err }, "Failed to get job clips");
    res.status(500).json({ error: "Failed to get job clips" });
  }
});

// Get single clip
router.get("/clips/:clipId", async (req, res) => {
  try {
    const params = GetClipParams.safeParse({ clipId: Number(req.params.clipId) });
    if (!params.success) return res.status(400).json({ error: "Invalid clipId" });

    const [clip] = await db.select().from(clipsTable).where(eq(clipsTable.id, params.data.clipId));
    if (!clip) return res.status(404).json({ error: "Clip not found" });

    res.json(formatClip(clip));
  } catch (err) {
    req.log.error({ err }, "Failed to get clip");
    res.status(500).json({ error: "Failed to get clip" });
  }
});

// Update clip
router.patch("/clips/:clipId", async (req, res) => {
  try {
    const params = UpdateClipParams.safeParse({ clipId: Number(req.params.clipId) });
    if (!params.success) return res.status(400).json({ error: "Invalid clipId" });

    const body = UpdateClipBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const updateData: Record<string, any> = {};
    if (body.data.title !== undefined) updateData.title = body.data.title;
    if (body.data.description !== undefined) updateData.description = body.data.description;

    const [clip] = await db
      .update(clipsTable)
      .set(updateData)
      .where(eq(clipsTable.id, params.data.clipId))
      .returning();

    if (!clip) return res.status(404).json({ error: "Clip not found" });

    res.json(formatClip(clip));
  } catch (err) {
    req.log.error({ err }, "Failed to update clip");
    res.status(500).json({ error: "Failed to update clip" });
  }
});

// Delete clip
router.delete("/clips/:clipId", async (req, res) => {
  try {
    const params = DeleteClipParams.safeParse({ clipId: Number(req.params.clipId) });
    if (!params.success) return res.status(400).json({ error: "Invalid clipId" });

    await db.delete(clipsTable).where(eq(clipsTable.id, params.data.clipId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete clip");
    res.status(500).json({ error: "Failed to delete clip" });
  }
});

// Regenerate clickbait thumbnail for a clip
router.post("/clips/:clipId/thumbnail", async (req, res) => {
  try {
    const clipId = Number(req.params.clipId);
    if (isNaN(clipId)) return res.status(400).json({ error: "Invalid clipId" });

    const [clip] = await db.select().from(clipsTable).where(eq(clipsTable.id, clipId));
    if (!clip) return res.status(404).json({ error: "Clip not found" });
    if (!clip.filePath) return res.status(400).json({ error: "Clip file not available" });

    const thumbFile = clip.filePath.replace(/\.mp4$/, "_thumb.jpg");
    await generateClickbaitThumbnail(clip.filePath, thumbFile, clip.title, clip.duration ?? 30);

    const [updated] = await db
      .update(clipsTable)
      .set({ thumbnailPath: thumbFile })
      .where(eq(clipsTable.id, clipId))
      .returning();

    res.json(formatClip(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate thumbnail");
    res.status(500).json({ error: "Failed to regenerate thumbnail" });
  }
});

// Upload clip to platforms
router.post("/clips/:clipId/upload", async (req, res) => {
  try {
    const params = UploadClipParams.safeParse({ clipId: Number(req.params.clipId) });
    if (!params.success) return res.status(400).json({ error: "Invalid clipId" });

    const body = UploadClipBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body" });

    const [clip] = await db.select().from(clipsTable).where(eq(clipsTable.id, params.data.clipId));
    if (!clip) return res.status(404).json({ error: "Clip not found" });
    if (!clip.filePath) return res.status(400).json({ error: "Clip file not available" });

    // Get accounts for requested platforms
    const accounts = await db.select().from(accountsTable);

    await db
      .update(clipsTable)
      .set({ status: "uploading" })
      .where(eq(clipsTable.id, clip.id));

    const results: Array<{ platform: string; success: boolean; url?: string; error?: string }> = [];
    const uploadedPlatforms = JSON.parse(clip.uploadedPlatforms || "[]") as string[];

    for (const platform of body.data.platforms) {
      const account = accounts.find((a) => a.platform === platform && a.isConnected);
      if (!account) {
        results.push({ platform, success: false, error: `No connected ${platform} account found` });
        continue;
      }

      let credentials: Record<string, any> = {};
      try {
        credentials = JSON.parse(account.credentials || "{}");
      } catch {
        credentials = {};
      }

      let result;
      if (platform === "youtube") {
        result = await uploadToYouTube(clip.filePath, clip.title, clip.description, credentials);
      } else if (platform === "instagram") {
        result = await uploadToInstagram(clip.filePath, clip.title, clip.description, credentials);
      } else if (platform === "tiktok") {
        result = await uploadToTikTok(clip.filePath, clip.title, clip.description, credentials);
      } else {
        result = { platform, success: false, error: "Unsupported platform" };
      }

      results.push(result);

      if (result.success && !uploadedPlatforms.includes(platform)) {
        uploadedPlatforms.push(platform);
      }
    }

    const allSucceeded = results.every((r) => r.success);
    const anySucceeded = results.some((r) => r.success);
    const newStatus = allSucceeded ? "uploaded" : anySucceeded ? "uploaded" : "failed";

    await db
      .update(clipsTable)
      .set({ status: newStatus, uploadedPlatforms: JSON.stringify(uploadedPlatforms) })
      .where(eq(clipsTable.id, clip.id));

    if (anySucceeded) {
      // Update job uploaded count
      const allJobClips = await db.select().from(clipsTable).where(eq(clipsTable.jobId, clip.jobId));
      const uploadedCount = allJobClips.filter((c) => c.status === "uploaded" || c.id === clip.id).length;
      await db.update(jobsTable).set({ uploadedCount }).where(eq(jobsTable.id, clip.jobId));

      await db.insert(activityTable).values({
        type: "clip_uploaded",
        description: `Clip "${clip.title}" uploaded to ${uploadedPlatforms.join(", ")}`,
        entityId: clip.id,
      });
    }

    res.json({ clipId: clip.id, results });
  } catch (err) {
    req.log.error({ err }, "Failed to upload clip");
    res.status(500).json({ error: "Failed to upload clip" });
  }
});

export default router;
