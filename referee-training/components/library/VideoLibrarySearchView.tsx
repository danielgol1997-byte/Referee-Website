"use client";

import { useState, useEffect } from "react";
import { VideoCarousel3D } from "./VideoCarousel3D";
import { cn } from "@/lib/utils";

const LAWS = Array.from({ length: 17 }, (_, i) => i + 1);
const SANCTIONS = [
  { value: 'YELLOW_CARD', label: 'Yellow Card', icon: '🟨' },
  { value: 'RED_CARD', label: 'Red Card', icon: '🟥' },
  { value: 'NO_CARD', label: 'No Card', icon: '✓' },
];
const RESTARTS = [
  { value: 'PENALTY_KICK', label: 'Penalty' },
  { value: 'DIRECT_FREE_KICK', label: 'Direct FK' },
  { value: 'INDIRECT_FREE_KICK', label: 'Indirect FK' },
  { value: 'CORNER_KICK', label: 'Corner' },
  { value: 'GOAL_KICK', label: 'Goal Kick' },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  _count: { videos: number };
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  sanctionType?: string;
  restartType?: string;
}

interface VideoLibrarySearchViewProps {
  categories: Category[];
  initialFeaturedVideos: Video[];
}

export function VideoLibrarySearchView({ categories, initialFeaturedVideos }: VideoLibrarySearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<number | null>(null);
  const [selectedSanction, setSelectedSanction] = useState<string | null>(null);
  const [selectedRestart, setSelectedRestart] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>(initialFeaturedVideos);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedLaw) params.append('laws', String(selectedLaw));
      if (selectedSanction) params.append('sanctions', selectedSanction);
      if (selectedRestart) params.append('restarts', selectedRestart);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/library/videos/search?${params}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on filter change
  useEffect(() => {
    if (selectedLaw || selectedSanction || selectedRestart || selectedCategory || searchQuery) {
      handleSearch();
    } else {
      setVideos(initialFeaturedVideos);
    }
  }, [selectedLaw, selectedSanction, selectedRestart, selectedCategory, searchQuery]);

  const hasFilters = searchQuery || selectedLaw || selectedSanction || selectedRestart || selectedCategory;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLaw(null);
    setSelectedSanction(null);
    setSelectedRestart(null);
    setSelectedCategory(null);
    setVideos(initialFeaturedVideos);
  };

  return (
    <div className="min-h-screen">
      {/* Minimal Filter Bar */}
      <div className="sticky top-[73px] z-40 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/30 shadow-2xl">
        <div className="mx-auto max-w-screen-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search videos..."
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-dark-800/40 border border-dark-600/30 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-cyan-500/50 focus:bg-dark-800/60 transition-all"
              />
            </div>

            {/* Law Dropdown */}
            <select
              value={selectedLaw || ''}
              onChange={(e) => setSelectedLaw(e.target.value ? Number(e.target.value) : null)}
              className="h-10 pl-3 pr-8 rounded-lg bg-dark-800/40 border border-dark-600/30 text-text-primary text-sm appearance-none focus:outline-none focus:border-cyan-500/50 focus:bg-dark-800/60 transition-all cursor-pointer hover:border-dark-500/50"
            >
              <option value="">All Laws</option>
              {LAWS.map(law => (
                <option key={law} value={law}>Law {law}</option>
              ))}
            </select>

            {/* Sanction Dropdown */}
            <select
              value={selectedSanction || ''}
              onChange={(e) => setSelectedSanction(e.target.value || null)}
              className="h-10 pl-3 pr-8 rounded-lg bg-dark-800/40 border border-dark-600/30 text-text-primary text-sm appearance-none focus:outline-none focus:border-cyan-500/50 focus:bg-dark-800/60 transition-all cursor-pointer hover:border-dark-500/50"
            >
              <option value="">All Sanctions</option>
              {SANCTIONS.map(sanction => (
                <option key={sanction.value} value={sanction.value}>
                  {sanction.label}
                </option>
              ))}
            </select>

            {/* Restart Dropdown */}
            <select
              value={selectedRestart || ''}
              onChange={(e) => setSelectedRestart(e.target.value || null)}
              className="h-10 pl-3 pr-8 rounded-lg bg-dark-800/40 border border-dark-600/30 text-text-primary text-sm appearance-none focus:outline-none focus:border-cyan-500/50 focus:bg-dark-800/60 transition-all cursor-pointer hover:border-dark-500/50"
            >
              <option value="">All Restarts</option>
              {RESTARTS.map(restart => (
                <option key={restart.value} value={restart.value}>
                  {restart.label}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-10 px-4 rounded-lg bg-dark-800/40 border border-dark-600/30 text-text-muted text-sm hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-screen-2xl px-6 py-12">
        {/* Video Carousel */}
        <div className="mb-16">
          {videos.length > 0 ? (
            <VideoCarousel3D videos={videos} autoplay={!hasFilters} />
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-dark-800/50 backdrop-blur-sm border border-dark-600/50 p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No videos found</h3>
              <p className="text-text-secondary mb-6">
                Try adjusting your filters or browse by category below
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all font-medium"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Cards */}
        <div className="mb-12">
          {categories.length > 0 && (
            <div className="relative">
              {/* Horizontal scroll container */}
              <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(selectedCategory === category.slug ? null : category.slug)}
                    className={cn(
                      "group flex-shrink-0 snap-center transition-all duration-300",
                      "transform hover:scale-105 active:scale-95"
                    )}
                    style={{
                      animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards`
                    }}
                  >
                    <div 
                      className={cn(
                        "w-56 h-36 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3",
                        "bg-dark-800/80 backdrop-blur-sm border transition-all duration-300",
                        "shadow-lg hover:shadow-2xl",
                        "transform-gpu perspective-1000",
                        "hover:rotate-y-2 hover:-translate-y-1",
                        selectedCategory === category.slug
                          ? "border-cyan-500 bg-cyan-500/10 shadow-cyan-500/20"
                          : "border-dark-600/50 hover:border-cyan-500/50"
                      )}
                      style={{
                        transform: selectedCategory === category.slug ? 'translateY(-4px)' : undefined,
                        borderColor: category.color && selectedCategory !== category.slug ? `${category.color}30` : undefined,
                      }}
                    >
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {category.icon || '🎬'}
                      </span>
                      <div>
                        <h4 className={cn(
                          "font-bold text-base leading-tight transition-colors",
                          selectedCategory === category.slug ? "text-cyan-400" : "text-text-primary group-hover:text-cyan-400"
                        )}>
                          {category.name}
                        </h4>
                        <p className="text-xs text-text-muted mt-1">
                          {category._count.videos} {category._count.videos === 1 ? 'video' : 'videos'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Scroll indicators */}
              <div className="absolute left-0 top-0 bottom-6 w-20 bg-gradient-to-r from-dark-900 via-dark-900/50 to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-6 w-20 bg-gradient-to-l from-dark-900 via-dark-900/50 to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
