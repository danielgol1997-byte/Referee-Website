import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/admin/ar-clips/upload/frame
 * Upload the captured pass-moment freeze-frame image to Cloudinary.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("frame") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No frame image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "referee-training/ar-frames",
      tags: ["ar", "pass-frame", "referee", "training"],
      resource_type: "image",
      transformation: [{ width: 1280, height: 720, crop: "fill", quality: "auto" }],
    });

    return NextResponse.json({
      success: true,
      frameUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Error uploading AR pass frame:", error);
    return NextResponse.json({ error: "Failed to upload frame" }, { status: 500 });
  }
}
