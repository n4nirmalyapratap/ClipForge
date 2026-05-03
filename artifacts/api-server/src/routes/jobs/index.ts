import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, clipsTable, activityTable, insertJobSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListJobsQueryParams,
  CreateJobBody,
  GetJobParams,
  DeleteJobParams,
  ProcessJobParams,
} from "@workspace/api-zod";
import { getVideoInfo, downloadVideo, getDownloadPath, getClipsDir } from "../../lib/video/downloader";
import { transcribeVideo, findMeaningfulSegments } from "../../lib/video/transcriber";
import { cutClip, generateClickbaitThumbnail } from "../../lib/video/clipper";
import path from "path";
import fs from "fs";

const router = Router();

// List jobs
router.get("/jobs", async (req, res) => {
  try {
    const query = ListJobsQueryParams.safeParse(req.query);
    let jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));

    if (query.success && query.data.status) {
      jobs = jobs.filter((j) => j.status === query.data.status);
    }

    res.json(
      jobs.map((j) => ({
        ...j,
        clipsCount: j.clipsCount,
        uploadedCount: j.uploadedCount,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list jobs");
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// Create job
router.post("/jobs", async (req, res) => {
  try {
    const body = CreateJobBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid request body", details: body.error });
    }

    const [job] = await db
      .insert(jobsTable)
      .values({ youtubeUrl: body.data.youtubeUrl, status: "pending" })
      .returning();

    await db.insert(activityTable).values({
      type: "job_created",
      description: `New job started for ${body.data.youtubeUrl}`,
      entityId: job.id,
    });

    res.status(201).json({
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create job");
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Get job
router.get("/jobs/:jobId", async (req, res) => {
  try {
    const params = GetJobParams.safeParse({ jobId: Number(req.params.jobId) });
    if (!params.success) return res.status(400).json({ error: "Invalid jobId" });

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.jobId));
    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json({ ...job, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get job");
    res.status(500).json({ error: "Failed to get job" });
  }
});

// Delete job
router.delete("/jobs/:jobId", async (req, res) => {
  try {
    const params = DeleteJobParams.safeParse({ jobId: Number(req.params.jobId) });
    if (!params.success) return res.status(400).json({ error: "Invalid jobId" });

    await db.delete(jobsTable).where(eq(jobsTable.id, params.data.jobId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete job");
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Process job (kick off AI pipeline)
router.post("/jobs/:jobId/process", async (req, res) => {
  try {
    const params = ProcessJobParams.safeParse({ jobId: Number(req.params.jobId) });
    if (!params.success) return res.status(400).json({ error: "Invalid jobId" });

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.jobId));
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Return immediately, run pipeline async
    const [updated] = await db
      .update(jobsTable)
      .set({ status: "downloading", updatedAt: new Date() })
      .where(eq(jobsTable.id, job.id))
      .returning();

    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });

    // Run pipeline in background (no await in response chain)
    runPipeline(job.id, job.youtubeUrl).catch((err) => {
      req.log.error({ err, jobId: job.id }, "Pipeline error");
    });
  } catch (err) {
    req.log.error({ err }, "Failed to process job");
    res.status(500).json({ error: "Failed to process job" });
  }
});

async function runPipeline(jobId: number, youtubeUrl: string) {
  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    await db
      .update(jobsTable)
      .set({ status, updatedAt: new Date(), ...extra })
      .where(eq(jobsTable.id, jobId));
  };

  try {
    // 1. Get video info
    const info = await getVideoInfo(youtubeUrl);
    await db
      .update(jobsTable)
      .set({
        videoTitle: info.title,
        videoThumbnail: info.thumbnail,
        videoDuration: info.duration,
        status: "downloading",
        updatedAt: new Date(),
      })
      .where(eq(jobsTable.id, jobId));

    // 2. Download video
    const videoPath = await downloadVideo(youtubeUrl, jobId);

    // 3. Transcribe
    await updateStatus("transcribing");
    const transcript = await transcribeVideo(videoPath);

    // 4. AI analysis
    await updateStatus("analyzing");
    const maxClips = Math.min(Math.ceil(info.duration / 120), 8);
    const segments = await findMeaningfulSegments(transcript, maxClips);

    if (segments.length === 0) {
      await updateStatus("failed", { errorMessage: "No meaningful segments found in video" });
      await db.insert(activityTable).values({
        type: "job_failed",
        description: `Job for "${info.title}" failed: no segments found`,
        entityId: jobId,
      });
      return;
    }

    // 5. Cut clips
    await updateStatus("clipping");
    const clipsDir = getClipsDir(jobId);
    let createdClips = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const duration = seg.endTime - seg.startTime;
      if (duration < 5 || duration > 90) continue;

      const clipFile = path.join(clipsDir, `clip_${i + 1}.mp4`);
      const thumbFile = path.join(clipsDir, `clip_${i + 1}_thumb.jpg`);

      try {
        await cutClip(videoPath, clipFile, seg.startTime, duration);
        try {
          await generateClickbaitThumbnail(clipFile, thumbFile, seg.title, duration);
        } catch {
          // thumbnail optional
        }

        const [clip] = await db
          .insert(clipsTable)
          .values({
            jobId,
            title: seg.title,
            description: seg.description,
            startTime: seg.startTime,
            endTime: seg.endTime,
            duration,
            filePath: clipFile,
            thumbnailPath: fs.existsSync(thumbFile) ? thumbFile : null,
            status: "ready",
            uploadedPlatforms: "[]",
            aiScore: seg.aiScore,
          })
          .returning();

        await db.insert(activityTable).values({
          type: "clip_created",
          description: `Clip "${seg.title}" created (${duration.toFixed(0)}s, score: ${seg.aiScore})`,
          entityId: clip.id,
        });

        createdClips++;
      } catch (clipErr) {
        // continue with next clip
      }
    }

    // Update job with final count
    await db
      .update(jobsTable)
      .set({ status: "done", clipsCount: createdClips, updatedAt: new Date() })
      .where(eq(jobsTable.id, jobId));

    await db.insert(activityTable).values({
      type: "job_done",
      description: `Job "${info.title}" completed with ${createdClips} clips`,
      entityId: jobId,
    });
  } catch (err: any) {
    await db
      .update(jobsTable)
      .set({ status: "failed", errorMessage: String(err?.message || err), updatedAt: new Date() })
      .where(eq(jobsTable.id, jobId));
    await db.insert(activityTable).values({
      type: "job_failed",
      description: `Job failed: ${String(err?.message || err).slice(0, 100)}`,
      entityId: jobId,
    });
  }
}

export default router;
