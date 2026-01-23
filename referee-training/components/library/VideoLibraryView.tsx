"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RAPCategoryTabs, RAPCategory } from "./RAPCategoryTabs";
import { VideoCard3D } from "./VideoCard3D";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
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
    category: {
      id: string;
      name: string;
      slug: string;
      canBeCorrectAnswer: boolean;
    } | null;
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
    customTagFilters: {},
  });
  const [activeCategory, setActiveCategory] = useState<RAPCategory>("all");
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [expandedVideoDetails, setExpandedVideoDetails] = useState<Video | null>(null);
  const [loadingVideoDetails, setLoadingVideoDetails] = useState(false);
  const [closingVideoId, setClosingVideoId] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [focusedVideoIndex, setFocusedVideoIndex] = useState<number>(-1);
  const [disableSharedLayout, setDisableSharedLayout] = useState(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Calculate columns per row based on window width
  const getColumnsPerRow = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 768) return 2;  // md
    return 1; // mobile
  }, []);

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

    // Custom tag category filters (including Laws)
    if (filters.customTagFilters) {
      for (const [categorySlug, selectedTags] of Object.entries(filters.customTagFilters)) {
        if (selectedTags.length > 0) {
          const hasMatch = selectedTags.some(tagSlug => videoTagSlugs.includes(tagSlug));
          if (!hasMatch) return false;
        }
      }
    }

    // Deprecated: laws filter (kept for backward compatibility, but laws now use tag system)
    // The customTagFilters above now handles law filtering via the 'laws' tag category

    return true;
  })
  .sort((a, b) => {
    // Get first CATEGORY tag from each video
    const aCategoryTag = a.tags?.find(t => t.category?.slug === 'category');
    const bCategoryTag = b.tags?.find(t => t.category?.slug === 'category');
    
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

  // Fetch full video details when a video is opened
  useEffect(() => {
    if (!expandedVideoId) {
      if (!closingVideoId) {
        setExpandedVideoDetails(null);
      }
      return;
    }

    // Check if we already have minimal data for this video
    const minimalVideo = videos.find(v => v.id === expandedVideoId);
    if (!minimalVideo) return;

    // If we already have full details cached, use them
    if (expandedVideoDetails?.id === expandedVideoId && expandedVideoDetails.fileUrl) {
      return;
    }

    // Fetch full details
    const controller = new AbortController();
    setLoadingVideoDetails(true);
    fetch(`/api/library/videos/${expandedVideoId}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch video details');
        return res.json();
      })
      .then(data => {
        setExpandedVideoDetails(data.video);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        console.error('Error fetching video details:', error);
        // Fallback to minimal data if fetch fails
        setExpandedVideoDetails(minimalVideo as Video);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingVideoDetails(false);
        }
      });
    return () => controller.abort();
  }, [expandedVideoId, videos, expandedVideoDetails, closingVideoId]);

  const activeVideoId = expandedVideoId ?? closingVideoId;
  const expandedVideo = activeVideoId
    ? expandedVideoDetails?.id === activeVideoId
      ? expandedVideoDetails
      : videos.find(v => v.id === activeVideoId)
    : null;

  const handleVideoClick = useCallback((videoId: string) => {
    setDisableSharedLayout(false);
    setExpandedVideoId(videoId);
    setShowDecision(false);
    setFocusedVideoIndex(-1); // Clear focus when opening a video
  }, []);

  const handleClose = () => {
    // Clear any pending navigation timeout to ensure shared layout is enabled
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = null;
    }
    
    setDisableSharedLayout(false);
    setClosingVideoId(expandedVideoId);
    
    // Set focus to the video that was just closed, so keyboard nav continues from there
    if (expandedVideoId) {
      const closedVideoIndex = filteredVideos.findIndex(v => v.id === expandedVideoId);
      if (closedVideoIndex !== -1) {
        setFocusedVideoIndex(closedVideoIndex);
      }
    }
    
    setExpandedVideoId(null);
    setShowDecision(false);
    // Clear closing video after animation completes
    setTimeout(() => {
      setClosingVideoId(null);
      setExpandedVideoDetails(null);
    }, 500);
  };

  const handleDecisionReveal = () => {
    setShowDecision(true);
  };

  const currentIndex = expandedVideoId 
    ? filteredVideos.findIndex(v => v.id === expandedVideoId)
    : -1;
  
  const hasNext = currentIndex !== -1 && currentIndex < filteredVideos.length - 1;
  const hasPrev = currentIndex > 0;

  const scheduleSharedLayoutResume = useCallback(() => {
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
    }
    navTimeoutRef.current = setTimeout(() => {
      setDisableSharedLayout(false);
    }, 300);
  }, []);

  const handleNext = () => {
    if (hasNext) {
      setDisableSharedLayout(true);
      setExpandedVideoId(filteredVideos[currentIndex + 1].id);
      setShowDecision(false);
      scheduleSharedLayoutResume();
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setDisableSharedLayout(true);
      setExpandedVideoId(filteredVideos[currentIndex - 1].id);
      setShowDecision(false);
      scheduleSharedLayoutResume();
    }
  };

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to focused video
  useEffect(() => {
    if (focusedVideoIndex >= 0 && videoRefs.current[focusedVideoIndex]) {
      const element = videoRefs.current[focusedVideoIndex];
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [focusedVideoIndex]);

  // Keyboard navigation for video grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when no video is expanded
      if (expandedVideoId || filteredVideos.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          return Math.min(prev + 1, filteredVideos.length - 1);
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          return Math.max(prev - 1, 0);
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          // Move down one row based on current columns per row
          const cols = getColumnsPerRow();
          return Math.min(prev + cols, filteredVideos.length - 1);
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          const cols = getColumnsPerRow();
          return Math.max(prev - cols, 0);
        });
      } else if (e.key === "Enter" && focusedVideoIndex >= 0) {
        e.preventDefault();
        const focusedVideo = filteredVideos[focusedVideoIndex];
        if (focusedVideo) {
          handleVideoClick(focusedVideo.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expandedVideoId, filteredVideos, focusedVideoIndex, handleVideoClick, getColumnsPerRow]);

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

  const sharedLayoutEnabled = !disableSharedLayout || closingVideoId !== null;

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
              {filteredVideos.map((video, index) => {
                const isClosing = closingVideoId === video.id;
                const isFocused = focusedVideoIndex === index;
                const isExpanding = expandedVideoId === video.id;
                const shouldHaveLayoutId = !expandedVideoId || expandedVideoId === video.id || closingVideoId === video.id;
                
                return (
                  <div 
                    key={video.id} 
                    ref={(el) => { videoRefs.current[index] = el; }}
                    className="relative"
                    style={{ zIndex: isClosing ? 10 : 0 }}
                  >
                    <motion.div
                      layoutId={shouldHaveLayoutId ? `video-${video.id}` : undefined}
                      onClick={() => handleVideoClick(video.id)}
                      className="w-full rounded-2xl cursor-pointer focus:outline-none"
                      style={{ position: "relative", zIndex: isClosing ? 10 : 1 }}
                      tabIndex={-1}
                      transition={isExpanding || isClosing ? { type: "spring", stiffness: 250, damping: 25 } : { duration: 0 }}
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
                        forceHover={isFocused}
                        isStatic={expandedVideoId === video.id || closingVideoId === video.id}
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
        {expandedVideo && expandedVideo.fileUrl && (
          <InlineVideoPlayer
            video={expandedVideo}
            isExpanded={!!expandedVideoId}
            isLoadingDetails={loadingVideoDetails}
            isSharedLayoutEnabled={sharedLayoutEnabled}
            suppressPoster={!sharedLayoutEnabled}
            isAnswerOpen={showDecision}
            onClose={handleClose}
            onDecisionReveal={handleDecisionReveal}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={hasNext}
            hasPrev={hasPrev}
            showDecision={showDecision}
            onCloseDecision={() => setShowDecision(false)}
          />
        )}
      </div>
    </LayoutGroup>
  );
}
