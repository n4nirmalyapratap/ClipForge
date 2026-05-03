import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CHUNK_SECS = 60; // 60-second audio chunks
const MAX_BYTES = 24 * 1024 * 1024; // 24MB safety check

function getFfmpegPath(): string {
  try {
    const { execSync } = require("child_process");
    return execSync("which ffmpeg", { encoding: "utf8" }).trim();
  } catch {
    return "ffmpeg";
  }
}

const FFMPEG_BIN = getFfmpegPath();

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  duration: number;
}

/** Extract audio as small mono mp3 for transcription */
async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.[^.]+$/, "_audio.mp3");
  logger.info({ videoPath, audioPath }, "Extracting audio");

  await execFileAsync(FFMPEG_BIN, [
    "-y", "-i", videoPath,
    "-vn",          // no video
    "-ac", "1",     // mono
    "-ar", "16000", // 16kHz (good for speech)
    "-b:a", "32k",  // 32kbps — tiny file
    audioPath,
  ]);

  const { size } = fs.statSync(audioPath);
  logger.info({ audioPath, sizeBytes: size }, "Audio extracted");
  return audioPath;
}

/** Get audio duration in seconds via ffmpeg */
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    // ffmpeg exits with error code when writing to /dev/null but prints duration to stderr
    const { stderr } = await execFileAsync(FFMPEG_BIN, [
      "-i", audioPath, "-f", "null", "-"
    ]).catch((e: any) => ({ stderr: e.stderr || "" })) as any;
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  } catch {}
  // fallback: estimate from file size at 32kbps
  const { size } = fs.statSync(audioPath);
  return (size * 8) / 32000;
}

/** Split audio into fixed-duration chunks and transcribe each, building timestamped segments */
async function transcribeWithChunks(audioPath: string): Promise<Transcript> {
  const totalDuration = await getAudioDuration(audioPath);
  const numChunks = Math.ceil(totalDuration / CHUNK_SECS);
  logger.info({ totalDuration, numChunks, chunkSecs: CHUNK_SECS }, "Transcribing in chunks");

  const allSegments: TranscriptSegment[] = [];
  let fullText = "";

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_SECS;
    const chunkPath = audioPath.replace(".mp3", `_c${i}.mp3`);

    // Extract this chunk
    await execFileAsync(FFMPEG_BIN, [
      "-y", "-i", audioPath,
      "-ss", String(startTime),
      "-t", String(CHUNK_SECS),
      "-c", "copy",
      chunkPath,
    ]);

    try {
      const chunkStats = fs.statSync(chunkPath);
      if (chunkStats.size < 1000) {
        logger.info({ i, chunkPath }, "Chunk too small, skipping");
        continue;
      }

      const fileStream = fs.createReadStream(chunkPath);
      const response = await (openai.audio.transcriptions.create as any)({
        file: fileStream,
        model: "gpt-4o-transcribe",
        response_format: "text",
      });

      const chunkText = typeof response === "string" ? response : (response.text || "");
      if (!chunkText.trim()) continue;

      fullText += chunkText + " ";

      // Estimate sub-segments by splitting on sentence boundaries within the chunk
      const sentences = chunkText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
      const avgTimePerSentence = CHUNK_SECS / Math.max(sentences.length, 1);

      sentences.forEach((sentence: string, idx: number) => {
        const segStart = startTime + idx * avgTimePerSentence;
        const segEnd = startTime + (idx + 1) * avgTimePerSentence;
        allSegments.push({ start: segStart, end: segEnd, text: sentence.trim() });
      });

      logger.info({ i, startTime, sentences: sentences.length }, `Chunk ${i + 1}/${numChunks} transcribed`);
    } finally {
      try { fs.unlinkSync(chunkPath); } catch {}
    }
  }

  return { text: fullText.trim(), segments: allSegments, duration: totalDuration };
}

export async function transcribeVideo(videoPath: string): Promise<Transcript> {
  let audioPath: string | null = null;

  try {
    audioPath = await extractAudio(videoPath);
    const result = await transcribeWithChunks(audioPath);
    logger.info({ segments: result.segments.length, duration: result.duration }, "Transcription done");
    return result;
  } finally {
    if (audioPath) try { fs.unlinkSync(audioPath); } catch {}
  }
}

export async function findMeaningfulSegments(
  transcript: Transcript,
  maxClips: number = 5
): Promise<Array<{ title: string; description: string; startTime: number; endTime: number; aiScore: number }>> {
  logger.info({ segments: transcript.segments.length, maxClips }, "GPT segment analysis");

  // Group segments into ~30-second windows so the prompt isn't enormous
  const groupedSegments: TranscriptSegment[] = [];
  let groupText = "";
  let groupStart = 0;
  let groupEnd = 0;

  for (const seg of transcript.segments) {
    if (groupText === "") groupStart = seg.start;
    groupText += " " + seg.text;
    groupEnd = seg.end;

    if (groupEnd - groupStart >= 30) {
      groupedSegments.push({ start: groupStart, end: groupEnd, text: groupText.trim() });
      groupText = "";
    }
  }
  if (groupText.trim()) {
    groupedSegments.push({ start: groupStart, end: groupEnd, text: groupText.trim() });
  }

  const transcriptText = groupedSegments
    .map((s) => `[${s.start.toFixed(0)}s–${s.end.toFixed(0)}s] ${s.text}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a video content analyst. Identify the best segments from a video transcript for short-form vertical video (YouTube Shorts, Instagram Reels, TikTok).

Rules for good clips:
- Each clip must span 15–60 seconds in the original video
- Must be self-contained — natural start and end at speech boundaries
- Prioritize: surprising facts, emotional moments, practical tips, strong opinions, stories
- Clear hook in the first few seconds
- Avoid clips referencing other parts ("as I mentioned", "like earlier")

Return ONLY a JSON object with a "clips" array.`,
      },
      {
        role: "user",
        content: `Find the ${maxClips} best short-form segments from this ${transcript.duration.toFixed(0)}s video transcript.

Transcript:
${transcriptText}

Return:
{ "clips": [ { "title": "Catchy title (max 60 chars)", "description": "Social caption (max 150 chars)", "startTime": 120, "endTime": 165, "aiScore": 87 } ] }

Ensure startTime and endTime align with the timestamps shown above, and the clip duration is between 15 and 60 seconds.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content || "{}";
  logger.info({ content: content.slice(0, 400) }, "GPT response");

  try {
    const parsed = JSON.parse(content);
    const clips = Array.isArray(parsed) ? parsed : (parsed.clips || parsed.segments || parsed.results || []);
    return clips.slice(0, maxClips).map((c: any) => ({
      title: String(c.title || "Clip"),
      description: String(c.description || ""),
      startTime: Number(c.startTime ?? 0),
      endTime: Number(c.endTime ?? 60),
      aiScore: Number(c.aiScore ?? 50),
    }));
  } catch (err) {
    logger.error({ err, content }, "Failed to parse GPT response");
    return [];
  }
}
