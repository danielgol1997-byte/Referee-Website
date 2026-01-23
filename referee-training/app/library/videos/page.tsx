import { prisma } from "@/lib/prisma";
import { VideoLibraryView } from "@/components/library/VideoLibraryView";
import { Prisma } from "@prisma/client";

export const revalidate = 300;

export default async function VideoLibraryPage() {
  try {
    // Fetch RAP categories with video counts
    const rapCategories = await prisma.videoCategory.findMany({
      where: {
        rapCategoryCode: { not: null },
        isActive: true,
      },
      include: {
        _count: {
          select: {
            videos: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Fetch minimal video data for list view (optimized payload)
    const videos = await prisma.videoClip.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        lawNumbers: true,
        sanctionType: true,
        restartType: true,
        isFeatured: true,
        videoCategory: {
          select: {
            rapCategoryCode: true,
          },
        },
        tags: {
          select: {
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
            isCorrectDecision: true,
            decisionOrder: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
    });

    // Format videos for client (minimal payload)
    const formattedVideos = videos.map(video => ({
      id: video.id,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl || undefined,
      duration: video.duration || undefined,
      viewCount: video.viewCount,
      lawNumbers: video.lawNumbers,
      sanctionType: video.sanctionType || undefined,
      restartType: video.restartType || undefined,
      isFeatured: video.isFeatured,
      rapCategoryCode: video.videoCategory?.rapCategoryCode || null,
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
    }));

    // Calculate video counts by RAP category using aggregated queries
    const [allCount, decisionMakingCount, managementCount, offsideCount, teamworkCount, lawsCount] = await Promise.all([
      prisma.videoClip.count({ where: { isActive: true } }),
      prisma.videoClip.count({
        where: {
          isActive: true,
          OR: [
            { videoCategory: { rapCategoryCode: 'A' } },
            { tags: { some: { tag: { rapCategory: 'A' } } } },
          ],
        },
      }),
      prisma.videoClip.count({
        where: {
          isActive: true,
          OR: [
            { videoCategory: { rapCategoryCode: 'B' } },
            { tags: { some: { tag: { rapCategory: 'B' } } } },
          ],
        },
      }),
      prisma.videoClip.count({
        where: {
          isActive: true,
          OR: [
            { videoCategory: { rapCategoryCode: 'C' } },
            { tags: { some: { tag: { rapCategory: 'C' } } } },
          ],
        },
      }),
      prisma.videoClip.count({
        where: {
          isActive: true,
          OR: [
            { videoCategory: { rapCategoryCode: 'D' } },
            { tags: { some: { tag: { rapCategory: 'D' } } } },
          ],
        },
      }),
      prisma.videoClip.count({
        where: {
          isActive: true,
          OR: [
            { videoCategory: { rapCategoryCode: 'L' } },
            { tags: { some: { tag: { rapCategory: 'L' } } } },
          ],
        },
      }),
    ]);

    const videoCounts = {
      all: allCount,
      'decision-making': decisionMakingCount,
      'management': managementCount,
      'offside': offsideCount,
      'teamwork': teamworkCount,
      'laws-of-the-game': lawsCount,
    };

    return (
      <VideoLibraryView 
        videos={formattedVideos}
        videoCounts={videoCounts}
      />
    );
  } catch (error) {
    const isPrismaKnown = error instanceof Prisma.PrismaClientKnownRequestError;
    const isPrismaUnknown = error instanceof Prisma.PrismaClientUnknownRequestError;
    const isPrismaValidation = error instanceof Prisma.PrismaClientValidationError;
    const baseMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: baseMessage,
      name: error instanceof Error ? error.name : 'UnknownError',
      code: isPrismaKnown ? error.code : undefined,
      meta: isPrismaKnown ? error.meta : undefined,
      type: isPrismaKnown
        ? 'PrismaKnownRequestError'
        : isPrismaUnknown
          ? 'PrismaUnknownRequestError'
          : isPrismaValidation
            ? 'PrismaValidationError'
            : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    };

    console.error('Error loading video library:', errorDetails);
    throw new Error(`Failed to load video library: ${baseMessage}`);
  }
}
