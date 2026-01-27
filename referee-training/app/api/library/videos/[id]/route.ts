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

    const baseSelect = {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      thumbnailUrl: true,
      duration: true,
      viewCount: true,
      lawNumbers: true,
      playOn: true,
      noOffence: true,
      sanctionType: true,
      restartType: true,
      offsideReason: true,
      correctDecision: true,
      decisionExplanation: true,
      keyPoints: true,
      commonMistakes: true,
      varNotes: true,
      isEducational: true,
      isFeatured: true,
      videoType: true,
      videoCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          rapCategoryCode: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          order: true,
        },
      },
      tags: {
        select: {
          isCorrectDecision: true,
          decisionOrder: true,
          tag: {
            select: {
              id: true,
              slug: true,
              name: true,
              rapCategory: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  canBeCorrectAnswer: true,
                },
              },
            },
          },
        },
      },
    };

    let video;
    try {
      video = await prisma.videoClip.findFirst({
        where: { id, isActive: true },
        select: {
          ...baseSelect,
          // Video editing metadata (may not exist in older DBs)
          trimStart: true,
          trimEnd: true,
          cutSegments: true,
          loopZoneStart: true,
          loopZoneEnd: true,
        },
      });
    } catch (error) {
      console.warn('Error fetching video with edit metadata, retrying without edit fields:', error);
      video = await prisma.videoClip.findFirst({
        where: { id, isActive: true },
        select: baseSelect,
      });
    }

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
      trimStart: (video as any).trimStart || undefined,
      trimEnd: (video as any).trimEnd || undefined,
      cutSegments: (video as any).cutSegments || undefined,
      loopZoneStart: (video as any).loopZoneStart || undefined,
      loopZoneEnd: (video as any).loopZoneEnd || undefined,
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
