"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
}

interface VideoLibraryViewProps {
  videos: Video[];
}

const SEARCH_STAGES = [
  { atMs: 0, label: "Understanding your search…" },
  { atMs: 3500, label: "Searching the video library…" },
  { atMs: 7500, label: "Ranking the best matches…" },
];

/** Staged progress shown while the AI search pipeline runs (takes a few seconds). */
function SearchProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timers = SEARCH_STAGES.slice(1).map((stage, i) =>
      setTimeout(() => setStageIndex(i + 1), stage.atMs)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mb-5 px-1">
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-3">
        <svg className="w-4 h-4 animate-spin text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cyan-300">{SEARCH_STAGES[stageIndex].label}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {SEARCH_STAGES.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i < stageIndex
                    ? "bg-cyan-400"
                    : i === stageIndex
                      ? "bg-cyan-400/60 animate-pulse"
                      : "bg-dark-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * VideoLibraryView - Main UEFA Video Library Page
 * 
 * Single-page experience with:
 * - Comprehensive filter bar (top)
 * - Gallery grid view with 3D hover effects
 * - Inline video player (no navigation)
 * - Decision reveal overlay
 */
export function VideoLibraryView({ videos }: VideoLibraryViewProps) {
  const [filters, setFilters] = useState<VideoFilters>({
    categoryTags: [],
    restarts: [],
    criteria: [],
    sanctions: [],
    scenarios: [],
    laws: [],
    customTagFilters: {},
  });
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [expandedVideoDetails, setExpandedVideoDetails] = useState<Video | null>(null);
  const [loadingVideoDetails, setLoadingVideoDetails] = useState(false);
  const [closingVideoId, setClosingVideoId] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [focusedVideoIndex, setFocusedVideoIndex] = useState<number>(-1);
  const [disableSharedLayout, setDisableSharedLayout] = useState(false);
  const [filterBarHeight, setFilterBarHeight] = useState(96);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const filterBarContainerRef = useRef<HTMLDivElement | null>(null);

  // Semantic search state
  const [searchResults, setSearchResults] = useState<Video[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{ totalResults: number; searchMethod: string } | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  // committedSearchText is what was last actually submitted (Enter / button).
  // filters.searchText is the live typed value shown in the input.
  const [committedSearchText, setCommittedSearchText] = useState<string>("");

  // Calculate columns per row based on window width
  const getColumnsPerRow = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 768) return 2;  // md
    return 1; // mobile
  }, []);

  // Hydration-safe localStorage restore for filter state.
  useEffect(() => {
    const savedFilters = localStorage.getItem("videoLibraryFilters");
    if (!savedFilters) return;
    try {
      const parsed = JSON.parse(savedFilters) as Partial<VideoFilters>;
      setFilters((prev) => ({
        ...prev,
        ...parsed,
        // Keep searchText unmanaged by persisted filters
        searchText: prev.searchText,
      }));
    } catch {
      console.error("Failed to parse saved filters");
    }
  }, []);

  // Semantic search effect - fires only when committedSearchText changes (user pressed Enter / Search button)
  useEffect(() => {
    const searchText = committedSearchText.trim();

    if (!searchText) {
      setSearchResults(null);
      setSearchMeta(null);
      setIsSearching(false);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);

    (async () => {
      try {
        const res = await fetch("/api/library/videos/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Tag filters are intentionally omitted: they were cleared when search was submitted
          body: JSON.stringify({ query: searchText }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (res.ok) {
          const data = await res.json();
          const results: Video[] = (data.results || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            thumbnailUrl: r.thumbnailUrl,
            fileUrl: r.fileUrl || "",
            duration: r.duration,
            viewCount: r.viewCount,
            lawNumbers: r.lawNumbers || [],
            sanctionType: r.sanctionType,
            restartType: r.restartType,
            isFeatured: r.isFeatured,
            tags: r.tags || [],
          }));
          setSearchResults(results);
          setSearchMeta(data.meta);

          // Apply high-confidence inferred tags so users can see what the AI matched
          const highConf = ((data.query?.inferredTags || []) as Array<{
            tagSlug: string;
            categorySlug: string;
            confidence: "high" | "medium";
          }>).filter((t) => t.confidence === "high");

          if (highConf.length > 0) {
            setFilters((prev) => {
              const next = { ...prev };
              for (const tag of highConf) {
                const { tagSlug: slug, categorySlug: cat } = tag;
                if (cat === "category" && !next.categoryTags.includes(slug))
                  next.categoryTags = [...next.categoryTags, slug];
                else if (cat === "restarts" && !next.restarts.includes(slug))
                  next.restarts = [...next.restarts, slug];
                else if (cat === "sanction" && !next.sanctions.includes(slug))
                  next.sanctions = [...next.sanctions, slug];
                else if (cat === "criteria" && !next.criteria.includes(slug))
                  next.criteria = [...next.criteria, slug];
                else if (cat === "scenario" && !next.scenarios.includes(slug))
                  next.scenarios = [...next.scenarios, slug];
                else {
                  // Any other tag category (laws, custom admin-created ones)
                  // lives in customTagFilters keyed by its category slug.
                  const custom = { ...(next.customTagFilters || {}) };
                  const existing = custom[cat] || [];
                  if (!existing.includes(slug)) {
                    custom[cat] = [...existing, slug];
                    next.customTagFilters = custom;
                  }
                }
              }
              return next;
            });
          }
        } else {
          console.error("Search failed:", res.status);
          setSearchResults(null);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Search error:", err);
          setSearchResults(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    })();

    return () => controller.abort();
  }, [committedSearchText]);

  // Submit the current search text: clear all previous filters, then fire search
  const handleSearch = useCallback(() => {
    const text = filters.searchText?.trim() || "";
    // Clear all tag filters so every new search starts fresh
    const freshFilters: VideoFilters = {
      categoryTags: [],
      restarts: [],
      criteria: [],
      sanctions: [],
      scenarios: [],
      laws: [],
      customTagFilters: {},
      searchText: filters.searchText,
    };
    setFilters(freshFilters);
    if (typeof window !== "undefined") {
      const { searchText: _st, ...toSave } = freshFilters;
      localStorage.setItem("videoLibraryFilters", JSON.stringify(toSave));
    }
    setCommittedSearchText(text);
    if (!text) {
      setSearchResults(null);
      setSearchMeta(null);
    }
  }, [filters.searchText]);

  const handleFiltersChange = (newFilters: VideoFilters) => {
    setFilters(newFilters);
    // If searchText was cleared, also clear the committed search
    if (!newFilters.searchText?.trim()) {
      setCommittedSearchText("");
      setSearchResults(null);
      setSearchMeta(null);
    }
    // Persist filters to localStorage (exclude searchText)
    if (typeof window !== 'undefined') {
      const { searchText, ...filtersToSave } = newFilters;
      localStorage.setItem('videoLibraryFilters', JSON.stringify(filtersToSave));
    }
  };

  // Apply all filters and sort by category tags
  const filteredVideos = videos
    .filter(video => {
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

  // When semantic search is active, use search results; otherwise use client-side filtered list
  const isInSearchMode = searchResults !== null;
  const displayVideos = isInSearchMode ? searchResults : filteredVideos;

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
      const closedVideoIndex = displayVideos.findIndex(v => v.id === expandedVideoId);
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
    ? displayVideos.findIndex(v => v.id === expandedVideoId)
    : -1;
  
  const hasNext = currentIndex !== -1 && currentIndex < displayVideos.length - 1;
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
      setExpandedVideoId(displayVideos[currentIndex + 1].id);
      setShowDecision(false);
      scheduleSharedLayoutResume();
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setDisableSharedLayout(true);
      setExpandedVideoId(displayVideos[currentIndex - 1].id);
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

  // Keep gallery offset synced with the dynamic filter bar height.
  useEffect(() => {
    const el = filterBarContainerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(el.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setFilterBarHeight(nextHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => observer.disconnect();
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
      // Never steal keys while an input or textarea is focused (e.g. the search box)
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Only handle keyboard navigation when no video is expanded
      if (expandedVideoId || displayVideos.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          return Math.min(prev + 1, displayVideos.length - 1);
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
          return Math.min(prev + cols, displayVideos.length - 1);
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
        const focusedVideo = displayVideos[focusedVideoIndex];
        if (focusedVideo) {
          handleVideoClick(focusedVideo.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expandedVideoId, displayVideos, focusedVideoIndex, handleVideoClick, getColumnsPerRow]);

  const handleClearFilters = () => {
    setFilters({
      categoryTags: [],
      restarts: [],
      criteria: [],
      sanctions: [],
      scenarios: [],
      laws: [],
      customTagFilters: {},
    });
  };

  const sharedLayoutEnabled = !disableSharedLayout || closingVideoId !== null;

  return (
    <LayoutGroup>
      <div className="relative min-h-screen">
        {/* Filter Bar - Fixed below header */}
        <div ref={filterBarContainerRef} className="fixed top-[88px] left-0 right-0 z-50">
          <VideoFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isSearching={isSearching}
            onSearch={handleSearch}
          />
        </div>

        {/* Video Gallery Grid - Dynamic top padding based on filter bar height */}
        <div
          className="pb-8 px-4 max-w-screen-2xl mx-auto"
          style={{ paddingTop: `${Math.max(filterBarHeight + 16, 96)}px` }}
        >
          {/* Staged search progress — the search takes several seconds, so
              show the user what is happening instead of a bare spinner. */}
          {isSearching && <SearchProgress />}

          {/* Search results count */}
          {isInSearchMode && searchMeta && !isSearching && (
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="text-sm text-text-muted">
                {searchMeta.totalResults} result{searchMeta.totalResults !== 1 ? "s" : ""} found
              </span>
            </div>
          )}

          {displayVideos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-text-secondary text-lg mb-4">
                {isInSearchMode
                  ? "No videos match your search"
                  : "No videos match your filters"}
              </div>
              <button
                onClick={handleClearFilters}
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-dark-900 font-semibold rounded-lg transition-all shadow-lg shadow-accent/30 hover:shadow-accent/50"
              >
                {isInSearchMode ? "Clear Search" : "Clear All Filters"}
              </button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${
                isSearching ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              {displayVideos.map((video, index) => {
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
