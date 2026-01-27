import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/library/videos/[id]
 * Get a single video by ID
 * Requires SUPER_ADMIN role
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const baseSelect = {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      thumbnailUrl: true,
      duration: true,
      categoryId: true,
      videoCategoryId: true,
      videoType: true,
      isEducational: true,
      correctDecision: true,
      decisionExplanation: true,
      keyPoints: true,
      commonMistakes: true,
      lawNumbers: true,
      playOn: true,
      noOffence: true,
      restartType: true,
      sanctionType: true,
      offsideReason: true,
      varRelevant: true,
      varNotes: true,
      isFeatured: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      videoCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          rapCategoryCode: true,
        },
      },
      tags: {
        select: {
          tagId: true,
          isCorrectDecision: true,
          decisionOrder: true,
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
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
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    let video;
    try {
      video = await prisma.videoClip.findFirst({
        where: { id },
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
        where: { id },
        select: baseSelect,
      });
    }

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/library/videos/[id]
 * Update a video
 * Requires SUPER_ADMIN role
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      fileUrl,
      thumbnailUrl,
      duration,
      categoryId,
      videoCategoryId,
      videoType,
      isEducational,
      correctDecision,
      decisionExplanation,
      keyPoints,
      commonMistakes,
      lawNumbers,
      playOn,
      noOffence,
      restartType,
      sanctionType,
      offsideReason,
      varRelevant,
      varNotes,
      tagIds, // Legacy support
      tagData, // New structured tag data with order and type
      isFeatured,
      isActive,
      // Video editing metadata
      trimStart,
      trimEnd,
      cutSegments,
      loopZoneStart,
      loopZoneEnd,
    } = body;

    const hasTagUpdate = Array.isArray(tagData) || Array.isArray(tagIds);
    const normalizedTagIds = Array.isArray(tagIds)
      ? Array.from(new Set(tagIds.filter((id: any) => typeof id === 'string' && id.trim())))
      : [];
    const normalizedTagData = Array.isArray(tagData)
      ? Array.from(
          new Map(
            tagData
              .filter((tag: any) => tag && typeof tag.tagId === 'string' && tag.tagId.trim())
              .map((tag: any) => [tag.tagId, tag])
          ).values()
        )
      : [];

    const normalizedDuration = Number.isFinite(duration) ? Math.round(duration) : duration;
    const tagRelations = normalizedTagData.length > 0
      ? {
          create: normalizedTagData.map((tag: any) => ({
            tagId: tag.tagId,
            isCorrectDecision: tag.isCorrectDecision || false,
            decisionOrder: tag.decisionOrder || 0,
          })),
        }
      : normalizedTagIds.length > 0
        ? {
            // Legacy support for old format
            create: normalizedTagIds.map((tagId: string) => ({
              tagId,
              isCorrectDecision: false,
              decisionOrder: 0,
            })),
          }
        : hasTagUpdate
          ? { create: [] }
          : undefined;

    const updateData = {
      title,
      description,
      fileUrl,
      thumbnailUrl,
      duration: normalizedDuration,
      categoryId,
      videoCategoryId,
      videoType,
      isEducational,
      correctDecision,
      decisionExplanation,
      keyPoints,
      commonMistakes,
      lawNumbers,
      playOn,
      noOffence,
      restartType,
      sanctionType,
      offsideReason,
      varRelevant,
      varNotes,
      isFeatured,
      isActive,
      // Video editing metadata - only update if explicitly provided
      ...(trimStart !== undefined ? { trimStart } : {}),
      ...(trimEnd !== undefined ? { trimEnd } : {}),
      ...(cutSegments !== undefined ? { cutSegments } : {}),
      ...(loopZoneStart !== undefined ? { loopZoneStart } : {}),
      ...(loopZoneEnd !== undefined ? { loopZoneEnd } : {}),
      ...(hasTagUpdate ? { tags: tagRelations } : {}),
    };

    const includeRelations = {
      category: true,
      videoCategory: true,
      tags: {
        include: {
          tag: true,
        },
      },
    };

    let video;
    if (!hasTagUpdate) {
      // Simple update without tag changes
      video = await prisma.videoClip.update({
        where: { id },
        data: updateData,
        include: includeRelations,
      });
    } else {
      // Transaction for tag updates
      video = await prisma.$transaction(async (tx) => {
        await tx.videoTag.deleteMany({ where: { videoId: id } });
        return tx.videoClip.update({
          where: { id },
          data: updateData,
          include: includeRelations,
        });
      });
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update video',
        code: error?.code,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/library/videos/[id]
 * Delete a video
 * Requires SUPER_ADMIN role
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Delete video (tags will be cascade deleted)
    await prisma.videoClip.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
