# ClipForge

## Overview

AI-powered YouTube video repurposing tool. Paste a YouTube URL, the AI downloads and transcribes the video, finds the most meaningful segments, cuts them into short-form clips (under 60s), and uploads them to YouTube Shorts, Instagram Reels, and TikTok.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/clipforge), dark indigo/violet theme
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI transcription**: OpenAI Whisper (via Replit AI Integrations)
- **AI analysis**: OpenAI GPT for finding meaningful segments
- **Video download**: youtube-dl-exec (yt-dlp)
- **Video cutting**: fluent-ffmpeg (system ffmpeg)
- **Upload APIs**: googleapis (YouTube), axios (Instagram Graph API, TikTok)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### Video Processing Pipeline

1. User pastes YouTube URL → `POST /api/jobs`
2. Click "Process" → `POST /api/jobs/:id/process` (returns immediately, runs in background)
3. Pipeline: download (yt-dlp) → transcribe (Whisper) → analyze (GPT) → cut clips (ffmpeg)
4. Clips appear on the job detail page with AI scores
5. User selects clips and platforms → `POST /api/clips/:id/upload`

### API Routes

- `/api/jobs` — CRUD for processing jobs
- `/api/clips` — CRUD for generated clips + upload endpoint
- `/api/accounts` — social media account credentials
- `/api/stats/dashboard` — aggregate stats
- `/api/stats/recent-activity` — activity feed
- `/api/stats/uploads-by-platform` — upload counts per platform

### Social Media Credentials

Credentials are stored in the `accounts` table (JSON encrypted at rest). Required credentials:

**YouTube**: `clientId`, `clientSecret`, `refreshToken` (Google Cloud Console → YouTube Data API v3)

**Instagram**: `accessToken`, `instagramAccountId` (Meta Developer Console → Instagram Graph API)

**TikTok**: `accessToken` (TikTok Developer Portal → Content Posting API)

### DB Schema

- `jobs` — YouTube URL, video metadata, processing status, clips/upload counts
- `clips` — generated shorts with AI score, timestamps, file paths, upload status
- `accounts` — connected social media accounts with encrypted credentials
- `activity` — audit log of all events

## Pages

- `/` — Dashboard with stats, recent activity, uploads by platform
- `/jobs` — list all jobs with status badges and thumbnails
- `/jobs/new` — paste YouTube URL form
- `/jobs/:id` — job detail with clip grid, AI scores, upload actions
- `/clips` — all clips across jobs, filterable by status
- `/accounts` — manage connected social media accounts
- `/settings` — step-by-step API credential setup guide per platform

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI Integrations proxy URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI Integrations API key
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL

## Notes

- System ffmpeg is used (available at runtime via Nix)
- Downloaded videos are stored in `./downloads/` relative to the API server working directory
- Clips are cut to 1080x1920 (portrait/vertical) for short-form compatibility
- The OpenAI integration is billed to Replit credits — no separate API key needed
