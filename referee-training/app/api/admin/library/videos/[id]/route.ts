import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeVideoAsset } from "@/lib/video-storage";
import { RestartType, SanctionType, VideoType } from "@prisma/client";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();

    // Get existing video
    const existingVideo = await prisma.videoClip.findUnique({
      where: { id }
    });

    if (!existingVideo) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Handle file uploads if provided
    let videoUrl = existingVideo.fileUrl;
    let thumbnailUrl = existingVideo.thumbnailUrl;

    const videoFile = formData.get('video') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (videoFile) {
      videoUrl = await storeVideoAsset(videoFile);
    }

    if (thumbnailFile) {
      thumbnailUrl = await storeVideoAsset(thumbnailFile, "thumbnails");
    }

    // Parse form data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const videoType = formData.get('videoType') as VideoType;
    const videoCategoryId = formData.get('videoCategoryId') as string;
    const lawNumbers = JSON.parse(formData.get('lawNumbers') as string || '[]');
    const tagIds = JSON.parse(formData.get('tagIds') as string || '[]');
    const sanctionType = ((formData.get('sanctionType') as string) || null) as SanctionType | null;
    const restartType = ((formData.get('restartType') as string) || null) as RestartType | null;
    const correctDecision = (formData.get('correctDecision') as string) || null;
    const decisionExplanation = (formData.get('decisionExplanation') as string) || null;
    const keyPoints = JSON.parse(formData.get('keyPoints') as string || '[]').filter((p: string) => p.trim());
    const commonMistakes = JSON.parse(formData.get('commonMistakes') as string || '[]').filter((m: string) => m.trim());
    const varRelevant = formData.get('varRelevant') === 'true';
    const varNotes = (formData.get('varNotes') as string) || null;
    const isActive = formData.get('isActive') === 'true';
    const isFeatured = formData.get('isFeatured') === 'true';

    // Update video
    const video = await prisma.videoClip.update({
      where: { id },
      data: {
        title,
        description,
        fileUrl: videoUrl,
        thumbnailUrl,
        videoType,
        videoCategoryId: videoCategoryId || null,
        lawNumbers,
        sanctionType,
        restartType,
        correctDecision,
        decisionExplanation,
        keyPoints,
        commonMistakes,
        varRelevant,
        varNotes,
        isActive,
        isFeatured,
      }
    });

    // Update tags - delete existing and create new
    await prisma.videoTag.deleteMany({
      where: { videoId: id }
    });

    for (const tagId of tagIds) {
      await prisma.videoTag.create({
        data: {
          videoId: id,
          tagId,
        }
      });
    }

    return NextResponse.json({ video, success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get video to delete files
    const video = await prisma.videoClip.findUnique({
      where: { id }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete video tags first
    await prisma.videoTag.deleteMany({
      where: { videoId: id }
    });

    // Delete video record
    await prisma.videoClip.delete({
      where: { id }
    });

    // Optionally delete files from filesystem
    // Note: Skipping file deletion for safety - you can add this if needed

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
