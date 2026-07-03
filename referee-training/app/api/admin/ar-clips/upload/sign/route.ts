import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";

const FOLDERS = {
  video: "referee-training/ar-videos",
  frame: "referee-training/ar-frames",
} as const;

/**
 * POST /api/admin/ar-clips/upload/sign
 * Returns a signed payload so the browser can upload directly to Cloudinary
 * (bypasses the serverless request body limit for large videos).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const kind: keyof typeof FOLDERS = body?.kind === "frame" ? "frame" : "video";
    const folder = FOLDERS[kind];
    const tags = "referee,training,ar";
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request({ folder, tags, timestamp }, apiSecret);

    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, tags });
  } catch (error) {
    console.error("Error signing AR upload:", error);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
