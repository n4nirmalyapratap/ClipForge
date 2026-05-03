import fs from "fs";
import path from "path";
import { logger } from "../logger";

export interface UploadResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadToYouTube(
  clipPath: string,
  title: string,
  description: string,
  credentials: Record<string, any>
): Promise<UploadResult> {
  try {
    const { google } = await import("googleapis");

    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      return { platform: "youtube", success: false, error: "Missing YouTube credentials: clientId, clientSecret, refreshToken required" };
    }

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: { title, description, categoryId: "22" },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      },
      media: {
        body: fs.createReadStream(clipPath),
      },
    });

    const videoId = res.data.id;
    return {
      platform: "youtube",
      success: true,
      url: `https://www.youtube.com/shorts/${videoId}`,
    };
  } catch (err: any) {
    return { platform: "youtube", success: false, error: String(err?.message || err) };
  }
}

export async function uploadToInstagram(
  clipPath: string,
  title: string,
  description: string,
  credentials: Record<string, any>
): Promise<UploadResult> {
  try {
    if (!credentials.accessToken || !credentials.instagramAccountId) {
      return { platform: "instagram", success: false, error: "Missing Instagram credentials: accessToken, instagramAccountId required" };
    }

    const axios = (await import("axios")).default;
    const FormData = (await import("form-data")).default;

    // Step 1: Create a media container
    const containerRes = await axios.post(
      `https://graph.facebook.com/v18.0/${credentials.instagramAccountId}/media`,
      {
        media_type: "REELS",
        caption: `${title}\n\n${description}`,
        access_token: credentials.accessToken,
        share_to_feed: true,
      }
    );

    const containerId = containerRes.data.id;

    // Step 2: Publish the container
    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${credentials.instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: credentials.accessToken,
      }
    );

    return {
      platform: "instagram",
      success: true,
      url: `https://www.instagram.com/reel/${publishRes.data.id}`,
    };
  } catch (err: any) {
    return { platform: "instagram", success: false, error: String(err?.response?.data?.error?.message || err?.message || err) };
  }
}

export async function uploadToTikTok(
  clipPath: string,
  title: string,
  description: string,
  credentials: Record<string, any>
): Promise<UploadResult> {
  try {
    if (!credentials.accessToken) {
      return { platform: "tiktok", success: false, error: "Missing TikTok credentials: accessToken required" };
    }

    const axios = (await import("axios")).default;
    const FormData = (await import("form-data")).default;

    const form = new FormData();
    form.append("video", fs.createReadStream(clipPath));

    const res = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: `${title} ${description}`.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fs.statSync(clipPath).size,
          chunk_size: fs.statSync(clipPath).size,
          total_chunk_count: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    return {
      platform: "tiktok",
      success: true,
      url: `https://www.tiktok.com/`,
    };
  } catch (err: any) {
    return { platform: "tiktok", success: false, error: String(err?.response?.data?.error?.message || err?.message || err) };
  }
}
