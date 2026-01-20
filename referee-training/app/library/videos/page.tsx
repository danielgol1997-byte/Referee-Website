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

    // Fetch all active videos
    const videos = await prisma.videoClip.findMany({
    where: {
      isActive: true,
    },
    include: {
      videoCategory: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          order: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' }
    ],
  });

  // Format videos for client
  const formattedVideos = videos.map(video => ({
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
    tags: video.tags.map(vt => ({
      id: vt.tag.id,
      slug: vt.tag.slug,
      name: vt.tag.name,
      category: vt.tag.category,
      rapCategory: vt.tag.rapCategory,
      isCorrectDecision: vt.isCorrectDecision,
      decisionOrder: vt.decisionOrder,
    })),
  }));

  // Calculate video counts by RAP category
  const videoCounts = {
    all: videos.length,
    'decision-making': videos.filter(v => {
      // Check videoCategory rapCode OR if any video tags have rapCategory 'A'
      return v.videoCategory?.rapCategoryCode === 'A' || 
             v.tags.some(vt => vt.tag.rapCategory === 'A');
    }).length,
    'management': videos.filter(v => {
      return v.videoCategory?.rapCategoryCode === 'B' || 
             v.tags.some(vt => vt.tag.rapCategory === 'B');
    }).length,
    'offside': videos.filter(v => {
      return v.videoCategory?.rapCategoryCode === 'C' || 
             v.tags.some(vt => vt.tag.rapCategory === 'C');
    }).length,
    'teamwork': videos.filter(v => {
      return v.videoCategory?.rapCategoryCode === 'D' || 
             v.tags.some(vt => vt.tag.rapCategory === 'D');
    }).length,
    'laws-of-the-game': videos.filter(v => {
      return v.videoCategory?.rapCategoryCode === 'L' || 
             v.tags.some(vt => vt.tag.rapCategory === 'L');
    }).length,
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
