import { prisma } from "@/lib/prisma";
import { VideoLibrarySearchView } from "@/components/library/VideoLibrarySearchView";

export const dynamic = "force-dynamic";

export default async function VideoLibraryPage() {
  // Fetch top-level categories with video counts
  const categories = await prisma.videoCategory.findMany({
    where: {
      parentId: null,
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

  // Fetch featured videos
  const featuredVideos = await prisma.videoClip.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    include: {
      videoCategory: true,
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' }
    ],
    take: 10
  });

  // Format featured videos
  const formattedFeatured = featuredVideos.map(video => ({
    id: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl || undefined,
    duration: video.duration || undefined,
    viewCount: video.viewCount,
    lawNumbers: video.lawNumbers,
    sanctionType: video.sanctionType || undefined,
    restartType: video.restartType || undefined,
  }));

  return (
    <VideoLibrarySearchView 
      categories={categories}
      initialFeaturedVideos={formattedFeatured}
    />
  );
}