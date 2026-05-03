import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobStatusEnum = ["pending", "downloading", "transcribing", "analyzing", "clipping", "done", "failed"] as const;

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  youtubeUrl: text("youtube_url").notNull(),
  videoTitle: text("video_title"),
  videoThumbnail: text("video_thumbnail"),
  videoDuration: integer("video_duration"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  clipsCount: integer("clips_count").notNull().default(0),
  uploadedCount: integer("uploaded_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
