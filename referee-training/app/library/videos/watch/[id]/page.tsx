import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VideoPlayer } from "@/components/ui/video-player";
import { DecisionReveal } from "@/components/library/DecisionReveal";
import { VideoCard3D } from "@/components/library/VideoCard3D";

export const revalidate = 300;

export default async function VideoWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch video with related data
  const video = await prisma.videoClip.findUnique({
    where: { id, isActive: true },
    include: {
      videoCategory: true,
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  if (!video) {
    notFound();
  }

  // Increment view count (in a real app, this should be done via API to avoid revalidation issues)
  // await prisma.videoClip.update({
  //   where: { id },
  //   data: { viewCount: { increment: 1 } }
  // });

  // Fetch related videos (same category or same laws)
  const relatedVideos = await prisma.videoClip.findMany({
    where: {
      isActive: true,
      id: { not: id },
      OR: [
        { videoCategoryId: video.videoCategoryId },
        { lawNumbers: { hasSome: video.lawNumbers } }
      ]
    },
    orderBy: { viewCount: 'desc' },
    take: 4
  });

  const formattedRelated = relatedVideos.map(v => ({
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl || undefined,
    duration: v.duration || undefined,
    viewCount: v.viewCount,
    lawNumbers: v.lawNumbers,
    sanctionType: v.sanctionType || undefined,
    restartType: v.restartType || undefined,
  }));

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link 
            href={video.videoCategory ? `/library/videos/${video.videoCategory.slug}` : '/library/videos'}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-cyan-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {video.videoCategory?.name || 'Library'}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <VideoPlayer 
                  source={video.fileUrl}
                  poster={video.thumbnailUrl || undefined}
                  className="w-full"
                />
              </div>
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-text-primary mb-3">
                  {video.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{video.viewCount} views</span>
                  </div>
                  {video.duration && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                      <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>{video.videoCategory?.name || 'Uncategorized'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="rounded-xl bg-dark-800/50 border border-dark-600 p-6">
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Scenario Description
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {video.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.tags.map(({ tag }) => (
                    <span 
                      key={tag.id}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-dark-800/50 border text-text-secondary hover:text-cyan-500 hover:border-cyan-500/50 transition-colors"
                      style={{
                        borderColor: tag.color ? `${tag.color}40` : undefined,
                        color: tag.color || undefined
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Decision Reveal */}
              {video.correctDecision && (
                <DecisionReveal
                  correctDecision={video.correctDecision}
                  decisionExplanation={video.decisionExplanation || undefined}
                  keyPoints={video.keyPoints}
                  commonMistakes={video.commonMistakes}
                  lawNumbers={video.lawNumbers}
                  sanctionType={video.sanctionType || undefined}
                  restartType={video.restartType || undefined}
                  varRelevant={video.varRelevant}
                  varNotes={video.varNotes || undefined}
                />
              )}
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-4">Related Videos</h2>
                <div className="space-y-4">
                  {formattedRelated.length === 0 ? (
                    <p className="text-sm text-text-muted">No related videos found</p>
                  ) : (
                    formattedRelated.map((relatedVideo) => (
                      <div key={relatedVideo.id} className="transform scale-95">
                        <VideoCard3D {...relatedVideo} size="small" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
