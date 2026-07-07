import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import Replicate from "replicate";
import { v2 as cloudinary } from "cloudinary";
import {
  HOLOGRAM_MODEL,
  HOLOGRAM_PROMPT,
  HOLOGRAM_GENERATION_OPTIONS,
} from "@/lib/hologram-config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const output = await replicate.run(HOLOGRAM_MODEL as `${string}/${string}`, {
      input: {
        prompt: HOLOGRAM_PROMPT,
        input_image: imageUrl,
        ...HOLOGRAM_GENERATION_OPTIONS,
      },
    });

    const generatedUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output)
        ? (output[0] as string)
        : String(output);

    if (!generatedUrl) {
      return NextResponse.json(
        { error: "Replicate returned no output" },
        { status: 500 }
      );
    }

    // Upload the result to Cloudinary for permanent storage
    const uploadResult = await cloudinary.uploader.upload(
      generatedUrl as string,
      {
        folder: "referee-holograms",
        resource_type: "image",
      }
    );

    return NextResponse.json({
      success: true,
      hologramUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Hologram generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate hologram", details: String(error) },
      { status: 500 }
    );
  }
}
