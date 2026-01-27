import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/library/videos/[id]
 * Get full video details for a specific video
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await prisma.videoClip.findFirst({
      where: { id, isActive: true },
      include: {
        videoCategory: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            order: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Format video for client
    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description || undefined,
      fileUrl: video.fileUrl,
      thumbnailUrl: video.thumbnailUrl || undefined,
      duration: video.duration || undefined,
      viewCount: video.viewCount,
      lawNumbers: video.lawNumbers,
      playOn: video.playOn,
      noOffence: video.noOffence,
      sanctionType: video.sanctionType || undefined,
      restartType: video.restartType || undefined,
      offsideReason: video.offsideReason || undefined,
      correctDecision: video.correctDecision || undefined,
      decisionExplanation: video.decisionExplanation || undefined,
      keyPoints: video.keyPoints,
      commonMistakes: video.commonMistakes,
      varNotes: video.varNotes || undefined,
      isEducational: video.isEducational,
      isFeatured: video.isFeatured,
      rapCategoryCode: video.videoCategory?.rapCategoryCode || null,
      videoType: video.videoType || undefined,
      // Video editing metadata
      trimStart: video.trimStart || undefined,
      trimEnd: video.trimEnd || undefined,
      cutSegments: video.cutSegments || undefined,
      loopZoneStart: video.loopZoneStart || undefined,
      loopZoneEnd: video.loopZoneEnd || undefined,
      tags: video.tags.map(vt => ({
        id: vt.tag.id,
        slug: vt.tag.slug,
        name: vt.tag.name,
        category: vt.tag.category
          ? {
              id: vt.tag.category.id,
              name: vt.tag.category.name,
              slug: vt.tag.category.slug,
              canBeCorrectAnswer: vt.tag.category.canBeCorrectAnswer,
            }
          : null,
        rapCategory: vt.tag.rapCategory,
        isCorrectDecision: vt.isCorrectDecision,
        decisionOrder: vt.decisionOrder,
      })),
    };

    return NextResponse.json({ video: formattedVideo });
  } catch (error) {
    console.error("Error fetching video details:", error);
    return NextResponse.json(
      { error: "Failed to fetch video details" },
      { status: 500 }
    );
  }
}
