import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { uploadVideo } from "@/lib/cloudinary";

export const maxDuration = 60;

/**
 * POST /api/admin/ar-clips/upload
 * Upload an AR clip video to Cloudinary (separate folder from the video library).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

    const result = await uploadVideo(base64, {
      folder: "referee-training/ar-videos",
      tags: ["referee", "training", "ar"],
    });

    return NextResponse.json({
      success: true,
      video: {
        url: result.secure_url,
        thumbnailUrl: result.thumbnail_url,
        publicId: result.public_id,
        duration: result.duration ?? null,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error("Error uploading AR clip:", error);
    const message = error instanceof Error ? error.message : "Failed to upload video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
