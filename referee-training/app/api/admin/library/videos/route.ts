import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.videoClip.findMany({
      include: {
        videoCategory: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Get videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Extract files
    const videoFile = formData.get('video') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    
    if (!videoFile) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'videos', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const thumbnailDir = join(process.cwd(), 'public', 'videos', 'uploads', 'thumbnails');
    if (!existsSync(thumbnailDir)) {
      await mkdir(thumbnailDir, { recursive: true });
    }

    // Save video file
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const videoFileName = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const videoPath = join(uploadDir, videoFileName);
    await writeFile(videoPath, videoBuffer);
    const videoUrl = `/videos/uploads/${videoFileName}`;

    // Save thumbnail if provided
    let thumbnailUrl: string | undefined;
    if (thumbnailFile) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailFileName = `${Date.now()}-${thumbnailFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const thumbnailPath = join(thumbnailDir, thumbnailFileName);
      await writeFile(thumbnailPath, thumbnailBuffer);
      thumbnailUrl = `/videos/uploads/thumbnails/${thumbnailFileName}`;
    }

    // Get library category
    let libraryCategory = await prisma.category.findFirst({
      where: { type: 'LIBRARY' }
    });

    if (!libraryCategory) {
      libraryCategory = await prisma.category.create({
        data: {
          name: 'Video Library',
          slug: 'video-library',
          type: 'LIBRARY',
        }
      });
    }

    // Parse form data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const videoType = formData.get('videoType') as string;
    const videoCategoryId = formData.get('videoCategoryId') as string;
    const lawNumbers = JSON.parse(formData.get('lawNumbers') as string || '[]');
    const tagIds = JSON.parse(formData.get('tagIds') as string || '[]');
    const sanctionType = (formData.get('sanctionType') as string) || null;
    const restartType = (formData.get('restartType') as string) || null;
    const correctDecision = (formData.get('correctDecision') as string) || null;
    const decisionExplanation = (formData.get('decisionExplanation') as string) || null;
    const keyPoints = JSON.parse(formData.get('keyPoints') as string || '[]').filter((p: string) => p.trim());
    const commonMistakes = JSON.parse(formData.get('commonMistakes') as string || '[]').filter((m: string) => m.trim());
    const varRelevant = formData.get('varRelevant') === 'true';
    const varNotes = (formData.get('varNotes') as string) || null;
    const isActive = formData.get('isActive') === 'true';
    const isFeatured = formData.get('isFeatured') === 'true';

    // Create video
    const video = await prisma.videoClip.create({
      data: {
        title,
        description,
        fileUrl: videoUrl,
        thumbnailUrl,
        videoType: videoType as any,
        categoryId: libraryCategory.id,
        videoCategoryId: videoCategoryId || null,
        lawNumbers,
        sanctionType: sanctionType as any,
        restartType: restartType as any,
        correctDecision,
        decisionExplanation,
        keyPoints,
        commonMistakes,
        varRelevant,
        varNotes,
        isActive,
        isFeatured,
        uploadedById: session.user.id,
      }
    });

    // Create tag associations
    for (const tagId of tagIds) {
      await prisma.videoTag.create({
        data: {
          videoId: video.id,
          tagId,
        }
      });
    }

    return NextResponse.json({ video, success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
