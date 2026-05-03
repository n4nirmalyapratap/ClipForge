import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";

export const clipStatusEnum = ["ready", "uploading", "uploaded", "failed"] as const;
export const platformEnum = ["youtube", "instagram", "tiktok"] as const;

export const clipsTable = pgTable("clips", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  duration: real("duration").notNull(),
  filePath: text("file_path"),
  thumbnailPath: text("thumbnail_path"),
  status: text("status").notNull().default("ready"),
  uploadedPlatforms: text("uploaded_platforms").notNull().default("[]"),
  aiScore: real("ai_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClipSchema = createInsertSchema(clipsTable).omit({ id: true, createdAt: true });
export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clipsTable.$inferSelect;
