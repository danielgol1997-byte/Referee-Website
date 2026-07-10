import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runVideoAnalysisPipeline } from '@/lib/ai/analyze-pipeline';
import { requireAdmin } from '@/lib/api-auth';
import { contentWhere } from '@/lib/scope';

// Video creation itself is fast, but the background AI analysis kicked off
// via after() needs the function to stay alive for a few minutes.
export const maxDuration = 300;

/**
 * GET /api/admin/library/videos
 * List all videos with filtering
 * Requires SUPER_ADMIN role
 */
export async function GET(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const videoCategoryId = searchParams.get('videoCategoryId');
    const isActive = searchParams.get('isActive');
    const usageStatus = searchParams.get('usageStatus');
    const customTagFiltersRaw = searchParams.get('customTagFilters');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    const andFilters: any[] = [];

    // FA admins only ever see global + their own association's videos.
    if (!isSuperAdmin(guard.user.role)) {
      andFilters.push(contentWhere(guard.user.associationId));
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (videoCategoryId) {
      where.videoCategoryId = videoCategoryId;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (tags.length > 0) {
      andFilters.push({
        tags: {
          some: {
            tagId: { in: tags },
            tag: { useInVideoLibrary: true },
          },
        },
      });
    }

    if (usageStatus === 'used') {
      andFilters.push({
        videoTestClips: { some: {} },
      });
    } else if (usageStatus === 'unused') {
      andFilters.push({
        videoTestClips: { none: {} },
      });
    }

    if (customTagFiltersRaw) {
      try {
        const customTagFilters = JSON.parse(customTagFiltersRaw) as Record<string, string[]>;
        for (const selectedSlugs of Object.values(customTagFilters || {})) {
          if (!Array.isArray(selectedSlugs) || selectedSlugs.length === 0) continue;
          andFilters.push({
            tags: {
              some: {
                tag: {
                  slug: { in: selectedSlugs },
                  useInVideoLibrary: true,
                },
              },
            },
          });
        }
      } catch (error) {
        console.warn('Invalid customTagFilters payload:', error);
      }
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    // Get total count for pagination
    const total = await prisma.videoClip.count({ where });

    // Fetch lightweight list data (no heavy relations)
    const videos = await prisma.videoClip.findMany({
      where,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        lawNumbers: true,
        isActive: true,
        isFeatured: true,
        searchDescriptionStatus: true,
        createdAt: true,
        videoCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
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
      },
      orderBy: [
        { isActive: 'desc' }, // Active videos first
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    const formattedVideos = videos.map(video => ({
      ...video,
      categoryTagLabel: video.tags
        ?.filter(tagRelation => tagRelation.tag?.category?.slug === 'category')
        .map(tagRelation => tagRelation.tag?.name)
        .filter(Boolean)
        .join(', ') || null,
      tags: video.tags?.map(tagRelation => tagRelation.tag).filter(Boolean) || [],
    }));

    return NextResponse.json({ 
      videos: formattedVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/videos
 * Create a new video
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    console.log('📹 Video creation request received');

    const guard = await requireAdmin();
    if (!guard.ok) {
      console.error('❌ Unauthorized video creation attempt');
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const superAdmin = isSuperAdmin(guard.user.role);

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

    // FA admins' uploads are auto-stamped with their association; super admins
    // may target a specific FA or leave it global (null).
    const associationId = superAdmin
      ? (typeof body?.associationId === 'string' && body.associationId ? body.associationId : null)
      : guard.user.associationId;
    if (!superAdmin && !associationId) {
      return NextResponse.json({ error: 'Your account is not linked to an association.' }, { status: 400 });
    }

    const normalizedDuration = Number.isFinite(duration)
      ? Math.round(duration as number)
      : duration;

    const normalizedTagData = Array.isArray(tagData)
      ? Array.from(
          new Map(
            tagData
              .filter((tag: any) => tag && typeof tag.tagId === 'string' && tag.tagId.trim())
              .map((tag: any) => [tag.tagId, tag])
          ).values()
        )
      : [];
    const correctDecisionCandidateIds = normalizedTagData
      .filter((tag: any) => !!tag.isCorrectDecision)
      .map((tag: any) => tag.tagId);
    const correctDecisionAllowedTagIds = new Set(
      (await prisma.tag.findMany({
        where: {
          id: { in: correctDecisionCandidateIds.length > 0 ? correctDecisionCandidateIds : ['__none__'] },
          useInVideoTests: true,
        },
        select: { id: true },
      })).map((tag) => tag.id)
    );
    
    console.log('📝 Request body:', {
      title,
      fileUrl,
      thumbnailUrl,
      categoryId,
      videoCategoryId,
      tagIds,
      tagData,
      lawNumbers,
    });

    // Validation
    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, fileUrl' },
        { status: 400 }
      );
    }

    // Find or create Video Library category
    let finalCategoryId = categoryId;
    
    if (!finalCategoryId) {
      console.log('🔍 No categoryId provided, finding/creating Video Library category...');
      
      let libraryCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: 'video-library' },
            { type: 'LIBRARY' }
          ]
        }
      });

      if (!libraryCategory) {
        console.log('📝 Creating Video Library category...');
        libraryCategory = await prisma.category.create({
          data: {
            name: 'Video Library',
            slug: 'video-library',
            type: 'LIBRARY',
            order: 11,
          }
        });
        console.log('✅ Created Video Library category:', libraryCategory.id);
      } else {
        console.log('✅ Found existing Video Library category:', libraryCategory.id);
      }

      finalCategoryId = libraryCategory.id;
    }

    console.log('📝 Creating video with:', {
      title,
      fileUrl,
      thumbnailUrl,
      categoryId: finalCategoryId,
      videoCategoryId,
      tagDataCount: tagData?.length || tagIds?.length || 0,
      lawNumbers,
      uploadedById: guard.user.id,
    });

    // Verify user exists before creating video
    const userExists = await prisma.user.findUnique({
      where: { id: guard.user.id },
    });

    if (!userExists) {
      console.warn('⚠️ User not found in database, creating video without uploadedById:', guard.user.id);
    }

    // Create video
    const video = await prisma.videoClip.create({
      data: {
        title,
        description,
        fileUrl,
        thumbnailUrl,
        duration: normalizedDuration,
        categoryId: finalCategoryId,
        videoCategoryId,
        videoType: videoType || 'EDUCATIONAL',
        isEducational: isEducational || false,
        correctDecision,
        decisionExplanation,
        keyPoints: keyPoints || [],
        commonMistakes: commonMistakes || [],
        lawNumbers: lawNumbers || [],
        playOn: playOn || false,
        noOffence: noOffence || false,
        restartType,
        sanctionType,
        offsideReason,
        varRelevant: varRelevant || false,
        varNotes,
        associationId,
        uploadedById: userExists ? guard.user.id : null, // Only set if user exists
        isFeatured: isFeatured || false,
        isActive: isActive !== undefined ? isActive : true,
        // Video editing metadata
        trimStart: trimStart !== undefined ? trimStart : null,
        trimEnd: trimEnd !== undefined ? trimEnd : null,
        cutSegments: cutSegments ? cutSegments : null,
        loopZoneStart: loopZoneStart !== undefined ? loopZoneStart : null,
        loopZoneEnd: loopZoneEnd !== undefined ? loopZoneEnd : null,
        // Create tag relations with correct decision info
        tags: normalizedTagData.length > 0 ? {
          create: normalizedTagData.map((tag: any) => {
            const canBeCorrectDecision = !!tag.isCorrectDecision && correctDecisionAllowedTagIds.has(tag.tagId);
            return {
              tagId: tag.tagId,
              isCorrectDecision: canBeCorrectDecision,
              decisionOrder: canBeCorrectDecision ? (tag.decisionOrder || 0) : 0,
            };
          }),
        } : tagIds && tagIds.length > 0 ? {
          // Legacy support for old format
          create: tagIds.map((tagId: string) => ({
            tagId,
            isCorrectDecision: false,
            decisionOrder: 0,
          })),
        } : undefined,
      },
      include: {
        category: true,
        videoCategory: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Kick off the AI analysis pipeline in the background (after the response
    // is sent). Marks the video as "analyzing" immediately so the admin UI can
    // show live status; the pipeline sets the final status when done.
    const userId = userExists ? guard.user.id : null;
    await prisma.videoClip.update({
      where: { id: video.id },
      data: { searchDescriptionStatus: 'analyzing' },
    });
    after(async () => {
      try {
        await runVideoAnalysisPipeline(video.id, { processedById: userId });
        console.log(`✅ Auto-analysis complete for video ${video.id}`);
      } catch (err) {
        console.error(`❌ Auto-analysis failed for video ${video.id}:`, err);
      }
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating video:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: 'Failed to create video',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
