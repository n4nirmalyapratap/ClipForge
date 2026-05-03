import ffmpeg from "fluent-ffmpeg";
import { execSync, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    return execSync("which ffmpeg", { encoding: "utf8" }).trim();
  } catch {
    return "/usr/bin/ffmpeg";
  }
}

const FFMPEG_BIN = getFfmpegPath();
ffmpeg.setFfmpegPath(FFMPEG_BIN);

function findFont(): string | null {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  ];
  // Try fc-list
  try {
    const out = execSync("fc-list : file family | grep -i 'bold\\|Bold' | head -3", { encoding: "utf8" });
    const match = out.match(/^([^:]+\.ttf)/m);
    if (match) candidates.unshift(match[1].trim());
  } catch {}
  // Try nix store fonts
  try {
    const out = execSync("find /nix/store -name '*.ttf' -path '*Bold*' 2>/dev/null | head -1", { encoding: "utf8" });
    const f = out.trim();
    if (f) candidates.unshift(f);
  } catch {}

  return candidates.find((f) => fs.existsSync(f)) || null;
}

const FONT_PATH = findFont();

export interface ClipSegment {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  aiScore: number;
}

export async function cutClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  // TikTok/Reels style: zoom-crop the 16:9 video to fill 9:16 portrait frame
  // The video is scaled so the width fills 1080px, then the height is centre-cropped to 1920px.
  // Audio is mapped explicitly to preserve the original audio track.
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .outputOptions([
        // Scale height to 1920 (keeps full width), then centre-crop to 1080 wide
        // → clean TikTok/Reels zoom-crop, nothing split, nothing layered
        "-vf", "scale=-2:1920,crop=1080:1920:(iw-1080)/2:0",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-b:a", "128k",
        "-crf", "23",
        "-preset", "fast",
        "-movflags", "+faststart",
      ])
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

export async function extractThumbnail(
  inputPath: string,
  outputPath: string,
  timeOffset: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(timeOffset)
      .frames(1)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

/**
 * Generate a clickbait-style thumbnail: bright best frame + bold text overlay.
 * Falls back to plain frame extraction if font is unavailable.
 */
export async function generateClickbaitThumbnail(
  clipPath: string,
  outputPath: string,
  title: string,
  duration: number
): Promise<void> {
  // Pick a frame at ~30% into the clip (usually good action moment)
  const seekTime = Math.max(0.5, duration * 0.3);

  // Sanitize title for ffmpeg drawtext (escape special chars)
  const safeTitle = title
    .replace(/'/g, "\u2019")  // smart quote
    .replace(/:/g, " -")
    .replace(/[\\[\]{}|<>]/g, "")
    .slice(0, 50);

  // Build filter chain
  // 1. Scale to 1080x1920 vertical
  // 2. Boost saturation and brightness slightly  
  // 3. Dark gradient at bottom for text legibility
  // 4. Bold white text with dark shadow

  let vf: string;
  if (FONT_PATH) {
    // Word-wrap title into two lines if long
    const words = safeTitle.split(" ");
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(" ");
    const line2 = words.slice(mid).join(" ");

    const textFilters = [
      // Dark gradient overlay at bottom 40%
      `drawbox=x=0:y=ih*0.6:w=iw:h=ih*0.4:color=black@0.7:t=fill`,
      // Line 1 text
      `drawtext=fontfile='${FONT_PATH}':text='${line1}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h*0.65:shadowcolor=black:shadowx=3:shadowy=3`,
    ];
    if (line2.trim()) {
      textFilters.push(
        `drawtext=fontfile='${FONT_PATH}':text='${line2}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=h*0.65+70:shadowcolor=black:shadowx=3:shadowy=3`
      );
    }

    vf = [
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "eq=saturation=1.3:brightness=0.05",
      ...textFilters,
    ].join(",");
  } else {
    // No font available — just crop and boost
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.3:brightness=0.05";
  }

  return new Promise((resolve, reject) => {
    ffmpeg(clipPath)
      .setStartTime(seekTime)
      .frames(1)
      .outputOptions(["-vf", vf])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        // Fallback: plain extraction
        extractThumbnail(clipPath, outputPath, seekTime).then(resolve).catch(reject);
      })
      .run();
  });
}
