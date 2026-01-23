"use client";

import { useState, useEffect } from "react";
import { InlineVideoPlayer } from "./InlineVideoPlayer";
import { DecisionReveal } from "./DecisionReveal";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { LAW_NUMBERS, formatLawLabel } from "@/lib/laws";

const LAWS = LAW_NUMBERS;
const SANCTIONS = [
  { value: 'YELLOW_CARD', label: 'Yellow Card' },
  { value: 'SECOND_YELLOW', label: 'Second Yellow' },
  { value: 'RED_CARD_DOGSO', label: 'Red Card - DOGSO' },
  { value: 'RED_CARD_SFP', label: 'Red Card - SFP' },
  { value: 'RED_CARD_VC', label: 'Red Card - VC' },
  { value: 'NO_CARD', label: 'No Card' },
];
const RESTARTS = [
  { value: 'PENALTY_KICK', label: 'Penalty Kick' },
  { value: 'DIRECT_FREE_KICK', label: 'Direct Free Kick' },
  { value: 'INDIRECT_FREE_KICK', label: 'Indirect Free Kick' },
  { value: 'CORNER_KICK', label: 'Corner Kick' },
  { value: 'GOAL_KICK', label: 'Goal Kick' },
  { value: 'THROW_IN', label: 'Throw-in' },
];

interface Video {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  sanctionType?: string;
  restartType?: string;
  offsideReason?: string;
  correctDecision?: string;
  decisionExplanation?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  varRelevant?: boolean;
  varNotes?: string;
  isEducational?: boolean;
}

/**
 * VideoSearchView - Advanced search with filters
 * Single-page video experience (no navigation)
 */
export function VideoSearchView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<number | null>(null);
  const [selectedSanction, setSelectedSanction] = useState<string | null>(null);
  const [selectedRestart, setSelectedRestart] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [focusedVideoIndex, setFocusedVideoIndex] = useState<number>(-1);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedLaw) params.append('laws', String(selectedLaw));
      if (selectedSanction) params.append('sanctions', selectedSanction);
      if (selectedRestart) params.append('restarts', selectedRestart);

      const response = await fetch(`/api/library/videos/search?${params}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLaw || selectedSanction || selectedRestart || searchQuery) {
      handleSearch();
    }
  }, [selectedLaw, selectedSanction, selectedRestart]);

  const expandedVideo = expandedVideoId 
    ? videos.find(v => v.id === expandedVideoId) 
    : null;

  // Keyboard navigation for video grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when no video is expanded
      if (expandedVideoId || videos.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          return Math.min(prev + 1, videos.length - 1);
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
          return Math.min(prev + 3, videos.length - 1);
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedVideoIndex((prev) => {
          if (prev === -1) return 0;
          return Math.max(prev - 3, 0);
        });
      } else if (e.key === "Enter" && focusedVideoIndex >= 0) {
        e.preventDefault();
        const focusedVideo = videos[focusedVideoIndex];
        if (focusedVideo) {
          setExpandedVideoId(focusedVideo.id);
          setShowDecision(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expandedVideoId, videos, focusedVideoIndex]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-dark-900">

      {/* Search Filters */}
      <div className="border-b border-dark-600 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Text Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search videos..."
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Law Filter */}
            <div>
              <label className="block text-sm font-semibold text-text-muted uppercase mb-2">
                Law Number
              </label>
              <select
                value={selectedLaw || ''}
                onChange={(e) => setSelectedLaw(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Laws</option>
                {LAWS.map((law) => (
                  <option key={law} value={law}>
                    {formatLawLabel(law)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sanction Filter */}
            <div>
              <label className="block text-sm font-semibold text-text-muted uppercase mb-2">
                Sanction
              </label>
              <select
                value={selectedSanction || ''}
                onChange={(e) => setSelectedSanction(e.target.value || null)}
                className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Sanctions</option>
                {SANCTIONS.map((sanction) => (
                  <option key={sanction.value} value={sanction.value}>
                    {sanction.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Restart Filter */}
            <div>
              <label className="block text-sm font-semibold text-text-muted uppercase mb-2">
                Restart Type
              </label>
              <select
                value={selectedRestart || ''}
                onChange={(e) => setSelectedRestart(e.target.value || null)}
                className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Restarts</option>
                {RESTARTS.map((restart) => (
                  <option key={restart.value} value={restart.value}>
                    {restart.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-text-secondary">Searching...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-text-secondary text-lg mb-4">
              {searchQuery || selectedLaw || selectedSanction || selectedRestart
                ? 'No videos found matching your search'
                : 'Enter search criteria to find videos'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              const isFocused = focusedVideoIndex === index;
              
              return (
              <button
                key={video.id}
                onClick={() => {
                  setExpandedVideoId(video.id);
                  setShowDecision(false);
                  setFocusedVideoIndex(-1);
                }}
                className={cn(
                  "group relative rounded-lg overflow-hidden",
                  "bg-slate-800 border border-slate-700 hover:border-cyan-500/50",
                  "transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20",
                  "text-left",
                  isFocused && "border-cyan-500/50 scale-105 shadow-2xl shadow-cyan-500/20"
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-900">
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={cn(
                        "object-cover transition-transform duration-300 group-hover:scale-110",
                        isFocused && "scale-110"
                      )}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-16 h-16 text-slate-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {video.lawNumbers.slice(0, 2).map((law) => (
                      <span
                        key={law}
                        className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded"
                      >
                        Law {law}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline Video Player */}
      {expandedVideo && (
        <InlineVideoPlayer
          video={expandedVideo}
          isExpanded={!!expandedVideoId}
          onClose={() => {
            // Set focus to the video that was just closed, so keyboard nav continues from there
            if (expandedVideoId) {
              const closedVideoIndex = videos.findIndex(v => v.id === expandedVideoId);
              if (closedVideoIndex !== -1) {
                setFocusedVideoIndex(closedVideoIndex);
              }
            }
            setExpandedVideoId(null);
            setShowDecision(false);
          }}
          onDecisionReveal={() => setShowDecision(true)}
        />
      )}

      {/* Decision Reveal Overlay */}
      {expandedVideo && (
        <DecisionReveal
          isOpen={showDecision}
          onClose={() => setShowDecision(false)}
          correctDecision={expandedVideo.correctDecision}
          restartType={expandedVideo.restartType}
          sanctionType={expandedVideo.sanctionType}
          offsideReason={expandedVideo.offsideReason}
          decisionExplanation={expandedVideo.decisionExplanation}
          keyPoints={expandedVideo.keyPoints}
          commonMistakes={expandedVideo.commonMistakes}
          varRelevant={expandedVideo.varRelevant}
          varNotes={expandedVideo.varNotes}
          isEducational={expandedVideo.isEducational}
          lawNumbers={expandedVideo.lawNumbers}
        />
      )}
    </div>
  );
}




