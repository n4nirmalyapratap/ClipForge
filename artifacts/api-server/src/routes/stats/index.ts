import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, clipsTable, accountsTable, activityTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// Dashboard stats
router.get("/stats/dashboard", async (req, res) => {
  try {
    const [jobs, clips, accounts] = await Promise.all([
      db.select().from(jobsTable),
      db.select().from(clipsTable),
      db.select().from(accountsTable),
    ]);

    const totalUploads = clips.filter((c) => c.status === "uploaded").length;
    const clipsReady = clips.filter((c) => c.status === "ready").length;
    const jobsProcessing = jobs.filter((j) =>
      ["downloading", "transcribing", "analyzing", "clipping"].includes(j.status)
    ).length;

    res.json({
      totalJobs: jobs.length,
      totalClips: clips.length,
      totalUploads,
      clipsReady,
      jobsProcessing,
      connectedAccounts: accounts.filter((a) => a.isConnected).length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// Recent activity
router.get("/stats/recent-activity", async (req, res) => {
  try {
    const activity = await db
      .select()
      .from(activityTable)
      .orderBy(desc(activityTable.createdAt))
      .limit(20);

    res.json(
      activity.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

// Uploads by platform
router.get("/stats/uploads-by-platform", async (req, res) => {
  try {
    const clips = await db.select().from(clipsTable);
    const counts: Record<string, number> = { youtube: 0, instagram: 0, tiktok: 0 };

    for (const clip of clips) {
      const platforms = JSON.parse(clip.uploadedPlatforms || "[]") as string[];
      for (const p of platforms) {
        if (p in counts) counts[p]++;
      }
    }

    res.json(Object.entries(counts).map(([platform, count]) => ({ platform, count })));
  } catch (err) {
    req.log.error({ err }, "Failed to get uploads by platform");
    res.status(500).json({ error: "Failed to get uploads by platform" });
  }
});

export default router;
