import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VideoCarousel3D } from "@/components/library/VideoCarousel3D";
import { VideoCard3D } from "@/components/library/VideoCard3D";
import { PillChip } from "@/components/ui/pill-chip";

export const revalidate = 300;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch category
  const category = await prisma.videoCategory.findUnique({
    where: { slug, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: {
              videos: {
                where: { isActive: true }
              }
            }
          }
        }
      },
      videos: {
        where: { isActive: true },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        },
        take: 20
      }
    }
  });

  if (!category) {
    notFound();
  }

  // Format videos for components
  const formattedVideos = category.videos.map(video => ({
    id: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl || undefined,
    duration: video.duration || undefined,
    viewCount: video.viewCount,
    lawNumbers: video.lawNumbers,
    sanctionType: video.sanctionType || undefined,
    restartType: video.restartType || undefined,
  }));

  const featuredVideos = formattedVideos.filter((_, idx) => idx < 5);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden bg-dark-900 border-b border-dark-700">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700" />
        
        <div className="relative z-10 mx-auto max-w-screen-xl px-6 py-12">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link 
              href="/library/videos"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-cyan-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Library
            </Link>
          </div>

          {/* Category Info */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-dark-800/50 border border-dark-600 flex items-center justify-center">
              <span className="text-5xl">{category.icon || '🎬'}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-lg text-text-secondary">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <section className="relative py-8 bg-dark-800/40 border-b border-dark-700">
          <div className="mx-auto max-w-screen-xl px-6">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
              Filter by Topic
            </h2>
            <div className="flex flex-wrap gap-3">
              <PillChip active={false}>
                All ({category.videos.length})
              </PillChip>
              {category.children.map((child) => (
                <Link key={child.id} href={`/library/videos/${child.slug}`}>
                  <PillChip>
                    {child.icon && <span className="mr-1">{child.icon}</span>}
                    {child.name} ({child._count.videos})
                  </PillChip>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Videos Carousel */}
      {featuredVideos.length > 0 && (
        <section className="relative py-12 bg-dark-900/60">
          <div className="mx-auto max-w-screen-xl px-6">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Featured Videos</h2>
            <p className="text-text-secondary mb-6">
              Key teaching moments and important decisions
            </p>
            <VideoCarousel3D videos={featuredVideos} autoplay={true} />
          </div>
        </section>
      )}

      {/* All Videos Grid */}
      <section className="relative py-12 bg-dark-800/40">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">All Videos</h2>
              <p className="text-text-secondary">
                {category.videos.length} video{category.videos.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-text-muted">Sort by:</label>
              <select className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                <option value="newest">Newest First</option>
                <option value="popular">Most Viewed</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>

          {category.videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-text-secondary mb-4">
                No videos in this category yet
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {formattedVideos.map((video) => (
                <VideoCard3D key={video.id} {...video} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
