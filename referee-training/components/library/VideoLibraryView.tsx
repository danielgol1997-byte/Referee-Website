"use client";

import { useState } from "react";
import { RAPCategoryTabs, RAPCategory } from "./RAPCategoryTabs";
import { VideoCard3D } from "./VideoCard3D";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
import { DecisionReveal } from "./DecisionReveal";
import { VideoFilterBar, VideoFilters } from "./VideoFilterBar";
import { LayoutGroup, motion } from "framer-motion";

interface Video {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  playOn?: boolean;
  noOffence?: boolean;
  sanctionType?: string;
  restartType?: string;
  offsideReason?: string;
  correctDecision?: string;
  decisionExplanation?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  varNotes?: string;
  isEducational?: boolean;
  isFeatured?: boolean;
  rapCategoryCode?: string | null;
  videoType?: string;
  tags?: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    rapCategory?: string | null;
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
}

interface VideoLibraryViewProps {
  videos: Video[];
  videoCounts: Record<RAPCategory, number>;
}

/**
 * VideoLibraryView - Main UEFA Video Library Page
 * 
 * Single-page experience with:
 * - Comprehensive filter bar (top)
 * - Gallery grid view with 3D hover effects
 * - RAP category tabs (below gallery, centered)
 * - Inline video player (no navigation)
 * - Decision reveal overlay
 */
export function VideoLibraryView({ videos, videoCounts }: VideoLibraryViewProps) {
  const [filters, setFilters] = useState<VideoFilters>({
    categoryTags: [],
    restarts: [],
    criteria: [],
    sanctions: [],
    scenarios: [],
    laws: [],
  });
  const [activeCategory, setActiveCategory] = useState<RAPCategory>("all");
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [closingVideoId, setClosingVideoId] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);

  // Sync RAP category with tabs
  const effectiveRAPCategory = filters.rapCategory || activeCategory;

  const handleCategoryChange = (category: RAPCategory) => {
    // If clicking the same category, deselect it
    if (category === activeCategory && category !== 'all') {
      setActiveCategory('all');
      setFilters(prev => ({ ...prev, rapCategory: undefined }));
    } else {
      setActiveCategory(category);
      setFilters(prev => ({ ...prev, rapCategory: category }));
    }
  };

  const handleFiltersChange = (newFilters: VideoFilters) => {
    setFilters(newFilters);
    // Sync category with tabs
    setActiveCategory(newFilters.rapCategory || 'all');
  };

  // Apply all filters and sort by category tags
  const filteredVideos = videos
    .filter(video => {
    // RAP Category filter (synced between tabs)
    if (effectiveRAPCategory !== 'all') {
      const categoryMap: Record<RAPCategory, string> = {
        'all': '',
        'decision-making': 'A',
        'management': 'B',
        'offside': 'C',
        'teamwork': 'D',
        'laws-of-the-game': 'L',
      };
      const targetRapCode = categoryMap[effectiveRAPCategory];
      
      // Check both videoCategory rapCode AND video tags' rapCategory
      const hasMatchingVideoCategory = video.rapCategoryCode === targetRapCode;
      const hasMatchingTag = video.tags?.some(t => t.rapCategory === targetRapCode);
      
      if (!hasMatchingVideoCategory && !hasMatchingTag) return false;
    }

    // Get video tag slugs for filtering
    const videoTagSlugs = video.tags?.map(t => t.slug) || [];

    // Category tags filter (multiple)
    if (filters.categoryTags.length > 0) {
      const hasMatch = filters.categoryTags.some(slug => videoTagSlugs.includes(slug));
      if (!hasMatch) return false;
    }

    // Restart filter (multiple)
    if (filters.restarts.length > 0) {
      const hasMatch = filters.restarts.some(slug => videoTagSlugs.includes(slug));
      if (!hasMatch) return false;
    }

    // Criteria filter (multiple)
    if (filters.criteria.length > 0) {
      const hasMatch = filters.criteria.some(slug => videoTagSlugs.includes(slug));
      if (!hasMatch) return false;
    }

    // Sanction filter (multiple)
    if (filters.sanctions.length > 0) {
      const hasMatch = filters.sanctions.some(slug => videoTagSlugs.includes(slug));
      if (!hasMatch) return false;
    }

    // Scenario filter (multiple)
    if (filters.scenarios.length > 0) {
      const hasMatch = filters.scenarios.some(slug => videoTagSlugs.includes(slug));
      if (!hasMatch) return false;
    }

    // Law filter (multiple)
    if (filters.laws.length > 0) {
      const hasMatch = filters.laws.some(law => video.lawNumbers.includes(law));
      if (!hasMatch) return false;
    }

    return true;
  })
  .sort((a, b) => {
    // Get first CATEGORY tag from each video
    const aCategoryTag = a.tags?.find(t => t.category === 'CATEGORY');
    const bCategoryTag = b.tags?.find(t => t.category === 'CATEGORY');
    
    // If both have category tags, sort alphabetically by tag name
    if (aCategoryTag && bCategoryTag) {
      return aCategoryTag.name.localeCompare(bCategoryTag.name);
    }
    
    // Videos with category tags come first
    if (aCategoryTag) return -1;
    if (bCategoryTag) return 1;
    
    // If neither has category tag, maintain original order (by createdAt from DB)
    return 0;
  });

  const expandedVideo = expandedVideoId 
    ? videos.find(v => v.id === expandedVideoId) 
    : null;

  const handleVideoClick = (videoId: string) => {
    setExpandedVideoId(videoId);
    setShowDecision(false);
  };

  const handleClose = () => {
    setClosingVideoId(expandedVideoId);
    setExpandedVideoId(null);
    setShowDecision(false);
    // Clear closing video after animation completes
    setTimeout(() => setClosingVideoId(null), 500);
  };

  const handleDecisionReveal = () => {
    setShowDecision(true);
  };

  const currentIndex = expandedVideoId 
    ? filteredVideos.findIndex(v => v.id === expandedVideoId)
    : -1;
  
  const hasNext = currentIndex !== -1 && currentIndex < filteredVideos.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setExpandedVideoId(filteredVideos[currentIndex + 1].id);
      setShowDecision(false);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setExpandedVideoId(filteredVideos[currentIndex - 1].id);
      setShowDecision(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      categoryTags: [],
      restarts: [],
      criteria: [],
      sanctions: [],
      scenarios: [],
      laws: [],
    });
    setActiveCategory("all");
  };

  return (
    <LayoutGroup>
      <div className="relative min-h-screen">
        {/* Filter Bar - Sticky below header, no gap */}
        <div className="sticky top-[88px] z-30">
          <VideoFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            videoCounts={videoCounts}
          />
        </div>

        {/* Video Gallery Grid - No extra padding */}
        <div className="py-8 px-4 max-w-screen-2xl mx-auto">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-text-secondary text-lg mb-4">
                No videos match your filters
              </div>
              <button
                onClick={handleClearFilters}
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-dark-900 font-semibold rounded-lg transition-all shadow-lg shadow-accent/30 hover:shadow-accent/50"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => {
                const isClosing = closingVideoId === video.id;
                
                return (
                  <div 
                    key={video.id} 
                    className="relative"
                    style={{ zIndex: isClosing ? 300 : 0 }}
                  >
                    <motion.div
                      layoutId={`video-${video.id}`}
                      onClick={() => handleVideoClick(video.id)}
                      className="w-full rounded-2xl cursor-pointer focus:outline-none"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ position: "relative", zIndex: isClosing ? 300 : 1 }}
                      tabIndex={-1}
                    >
                      <VideoCard3D
                        id={video.id}
                        title={video.title}
                        thumbnailUrl={video.thumbnailUrl}
                        duration={video.duration}
                        viewCount={video.viewCount}
                        lawNumbers={video.lawNumbers}
                        sanctionType={video.sanctionType}
                        restartType={video.restartType}
                        size="medium"
                      />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RAP Category Tabs - Below Gallery */}
        <div className="py-8 border-t border-dark-600/50 bg-dark-900/50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-text-muted mb-6">
              Browse by Category
            </h2>
            <div className="flex justify-center">
              <RAPCategoryTabs
                activeCategory={effectiveRAPCategory}
                onCategoryChange={handleCategoryChange}
                videoCounts={videoCounts}
              />
            </div>
          </div>
        </div>

        {/* Inline Video Player (Full screen overlay) */}
        {expandedVideo && (
          <InlineVideoPlayer
            video={expandedVideo}
            isExpanded={!!expandedVideoId}
            isAnswerOpen={showDecision}
            onClose={handleClose}
            onDecisionReveal={handleDecisionReveal}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
        )}

        {/* Decision Reveal Overlay */}
        {expandedVideo && (
          <DecisionReveal
            isOpen={showDecision}
            onClose={() => setShowDecision(false)}
            playOn={expandedVideo.playOn}
            noOffence={expandedVideo.noOffence}
            correctDecision={expandedVideo.correctDecision}
            restartType={expandedVideo.restartType}
            sanctionType={expandedVideo.sanctionType}
            offsideReason={expandedVideo.offsideReason}
            decisionExplanation={expandedVideo.decisionExplanation}
            keyPoints={expandedVideo.keyPoints}
            commonMistakes={expandedVideo.commonMistakes}
            varRelevant={false}
            varNotes={expandedVideo.varNotes}
            isEducational={expandedVideo.isEducational}
            lawNumbers={expandedVideo.lawNumbers}
            tags={expandedVideo.tags}
          />
        )}
      </div>
    </LayoutGroup>
  );
}
