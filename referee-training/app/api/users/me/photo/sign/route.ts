import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/users/me/photo/sign
 * Returns a signed payload so a signed-in user can upload a profile photo
 * directly to Cloudinary.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
  }

  const folder = "referee-training/profile-photos";
  const tags = "referee,training,profile";
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request({ folder, tags, timestamp }, apiSecret);

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, tags });
}
