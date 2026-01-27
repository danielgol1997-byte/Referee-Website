import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/library/videos
 * List all videos with filtering
 * Requires SUPER_ADMIN role
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const videoCategoryId = searchParams.get('videoCategoryId');
    const isActive = searchParams.get('isActive');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

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
      where.tags = {
        some: {
          tagId: { in: tags },
        },
      };
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
      },
      orderBy: [
        { isActive: 'desc' }, // Active videos first
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return NextResponse.json({ 
      videos,
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
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      console.error('❌ Unauthorized video creation attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authorized:', session.user.email, 'ID:', session.user.id);

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
      uploadedById: session.user.id,
    });

    // Verify user exists before creating video
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      console.warn('⚠️ User not found in database, creating video without uploadedById:', session.user.id);
    }

    // Create video
    const video = await prisma.videoClip.create({
      data: {
        title,
        description,
        fileUrl,
        thumbnailUrl,
        duration,
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
        uploadedById: userExists ? session.user.id : null, // Only set if user exists
        isFeatured: isFeatured || false,
        isActive: isActive !== undefined ? isActive : true,
        // Video editing metadata
        trimStart: trimStart !== undefined ? trimStart : null,
        trimEnd: trimEnd !== undefined ? trimEnd : null,
        cutSegments: cutSegments ? cutSegments : null,
        loopZoneStart: loopZoneStart !== undefined ? loopZoneStart : null,
        loopZoneEnd: loopZoneEnd !== undefined ? loopZoneEnd : null,
        // Create tag relations with correct decision info
        tags: tagData && tagData.length > 0 ? {
          create: tagData.map((tag: any) => ({
            tagId: tag.tagId,
            isCorrectDecision: tag.isCorrectDecision || false,
            decisionOrder: tag.decisionOrder || 0,
          })),
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
