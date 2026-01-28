import { prisma } from "@/lib/prisma";
import { VideoLibraryView } from "@/components/library/VideoLibraryView";
import { Prisma } from "@prisma/client";

export const revalidate = 300;

export default async function VideoLibraryPage() {
  try {
    // Fetch minimal video data for list view (optimized payload)
    const videos = await prisma.videoClip.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        lawNumbers: true,
        sanctionType: true,
        restartType: true,
        isFeatured: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                slug: true,
                name: true,
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
      fileUrl: video.fileUrl,
      thumbnailUrl: video.thumbnailUrl || undefined,
      duration: video.duration || undefined,
      viewCount: video.viewCount,
      lawNumbers: video.lawNumbers,
      sanctionType: video.sanctionType || undefined,
      restartType: video.restartType || undefined,
      isFeatured: video.isFeatured,
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
        isCorrectDecision: vt.isCorrectDecision,
        decisionOrder: vt.decisionOrder,
      })),
    }));

    return (
      <VideoLibraryView 
        videos={formattedVideos}
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
