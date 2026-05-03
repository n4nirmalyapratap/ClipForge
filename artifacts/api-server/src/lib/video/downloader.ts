import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);

// Resolve yt-dlp binary — installed via pip into pythonlibs
const YTDLP_PATHS = [
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
];

function getYtdlpBin(): string {
  for (const p of YTDLP_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // fallback: try PATH
  return "yt-dlp";
}

const YTDLP_BIN = getYtdlpBin();

const DOWNLOADS_DIR = path.resolve(process.cwd(), "downloads");
const THUMBNAILS_DIR = path.resolve(process.cwd(), "thumbnails");

export function ensureDirectories() {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  id: string;
}

export async function getVideoInfo(youtubeUrl: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(YTDLP_BIN, [
    "--dump-single-json",
    "--no-warnings",
    "--no-check-certificates",
    youtubeUrl,
  ]);

  const info = JSON.parse(stdout);
  return {
    title: info.title || "Untitled",
    thumbnail: info.thumbnail || "",
    duration: info.duration || 0,
    id: info.id || "",
  };
}

export async function downloadVideo(youtubeUrl: string, jobId: number): Promise<string> {
  ensureDirectories();
  const outputTemplate = path.join(DOWNLOADS_DIR, `job_${jobId}.%(ext)s`);

  logger.info({ jobId, youtubeUrl }, "Starting yt-dlp download");

  await execFileAsync(YTDLP_BIN, [
    "--no-warnings",
    "--no-check-certificates",
    "-f",
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    "--merge-output-format",
    "mp4",
    "-o",
    outputTemplate,
    youtubeUrl,
  ], { maxBuffer: 100 * 1024 * 1024 });

  // Find the created file
  const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(`job_${jobId}`));
  if (files.length === 0) throw new Error("Download failed: no output file created");

  const filePath = path.join(DOWNLOADS_DIR, files[0]);
  logger.info({ jobId, filePath }, "Download complete");
  return filePath;
}

export function getDownloadPath(jobId: number): string | null {
  ensureDirectories();
  const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(`job_${jobId}`));
  return files.length > 0 ? path.join(DOWNLOADS_DIR, files[0]) : null;
}

export function getClipsDir(jobId: number): string {
  const dir = path.join(DOWNLOADS_DIR, `job_${jobId}_clips`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
