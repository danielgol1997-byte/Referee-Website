"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useModal } from "@/components/ui/modal";

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  sanctionType?: string;
  isActive: boolean;
  isFeatured: boolean;
  videoCategory?: { name: string };
  createdAt: string;
}

interface VideoListManagerProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (videoId: string) => void;
  onRefresh: () => void;
  onVideoUpdate?: (videoId: string, updates: Partial<Video>) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function VideoListManager({ 
  videos, 
  onEdit, 
  onDelete, 
  onRefresh,
  onVideoUpdate,
  pagination,
  onPageChange,
  searchQuery = '',
  onSearchChange,
}: VideoListManagerProps) {
  const modal = useModal();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterFeatured, setFilterFeatured] = useState<'all' | 'featured' | 'normal'>('all');

  // Client-side filtering for status/featured (server handles search)
  const filteredVideos = videos.filter(video => {
    if (filterActive === 'active' && !video.isActive) return false;
    if (filterActive === 'inactive' && video.isActive) return false;
    if (filterFeatured === 'featured' && !video.isFeatured) return false;
    if (filterFeatured === 'normal' && video.isFeatured) return false;
    return true;
  }).sort((a, b) => {
    // Sort: Active videos first, then by featured, then by creation date
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(localSearchQuery);
  };

  const handleDelete = async (videoId: string, videoTitle: string) => {
    const confirmed = await modal.showConfirm(
      `Are you sure you want to delete "${videoTitle}"?`,
      'Delete Video',
      'warning'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/admin/library/videos/${videoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      await modal.showSuccess('Video deleted successfully!');
      onDelete(videoId);
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      await modal.showError('Failed to delete video');
    }
  };

  const [updatingVideoId, setUpdatingVideoId] = useState<string | null>(null);
  const [slidingVideoId, setSlidingVideoId] = useState<string | null>(null);

  const toggleActive = async (videoId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // First, update the switch state visually (optimistic update)
    setUpdatingVideoId(videoId);
    
    // Wait for switch animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Start card slide animation
    setSlidingVideoId(videoId);
    
    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) return;
      
      const response = await fetch(`/api/admin/library/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...video,
          isActive: newStatus,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to toggle video status');
      
      // Wait for fade animation to complete
      setTimeout(() => {
        setUpdatingVideoId(null);
        setSlidingVideoId(null);
        
        // Update state directly without full refresh if callback is available
        if (onVideoUpdate) {
          onVideoUpdate(videoId, { isActive: newStatus });
        } else {
          onRefresh();
        }
      }, 700); // Time for the fade-out and collapse
    } catch (error) {
      console.error('Toggle active error:', error);
      await modal.showError('Failed to update video status');
      setUpdatingVideoId(null);
      setSlidingVideoId(null);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <style jsx>{`
        @keyframes fadeOut {
          0% {
            opacity: 1;
            max-height: 500px;
            margin-bottom: 0.75rem;
          }
          100% {
            opacity: 0;
            max-height: 0;
            margin-bottom: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
        }
        .animate-fade-out {
          animation: fadeOut 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          pointer-events: none;
          overflow: hidden;
        }
      `}</style>
      {/* Search & Filters */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={filterFeatured}
              onChange={(e) => setFilterFeatured(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Videos</option>
              <option value="featured">Featured Only</option>
              <option value="normal">Non-Featured</option>
            </select>

            <button
              onClick={onRefresh}
              className="px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary hover:bg-dark-800 hover:border-cyan-500/50 transition-all"
              title="Refresh list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <div>
            Showing {filteredVideos.length} of {pagination?.total ?? videos.length} videos
            {pagination && ` (Page ${pagination.page} of ${pagination.totalPages})`}
          </div>
        </div>
      </div>

      {/* Video List */}
      <div className="space-y-3 transition-all duration-700">
        {filteredVideos.length === 0 ? (
          <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-12 text-center">
            <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-text-secondary">No videos found</p>
          </div>
        ) : (
          filteredVideos.map(video => (
            <div
              key={video.id}
              data-video-id={video.id}
              className={cn(
                "rounded-xl bg-dark-800/50 border border-dark-600 p-4 hover:border-cyan-500/50 transition-all duration-700",
                !video.isActive && "opacity-75",
                slidingVideoId === video.id && "animate-fade-out"
              )}
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-40 h-24 rounded-lg bg-dark-900 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-text-primary truncate mb-1">
                        {video.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span className="text-text-muted">Category:</span>
                          {video.videoCategory?.name || 'Uncategorized'}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(video.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {video.viewCount} views
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2 items-center">
                      {video.isFeatured && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
                          Featured
                        </span>
                      )}
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                        video.isActive
                          ? "bg-green-500/10 border border-green-500/30 text-green-500"
                          : "bg-red-500/10 border border-red-500/30 text-red-500"
                      )}>
                        {video.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {/* Toggle Switch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(video.id, video.isActive);
                        }}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-dark-800"
                        style={{ 
                          backgroundColor: (updatingVideoId === video.id ? !video.isActive : video.isActive) ? '#10b981' : '#ef4444' 
                        }}
                        title={`Click to ${video.isActive ? 'deactivate' : 'activate'}`}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
                            (updatingVideoId === video.id ? !video.isActive : video.isActive) ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {video.lawNumbers.length > 0 && video.lawNumbers.slice(0, 3).map(law => (
                      <span key={law} className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 font-semibold">
                        Law {law}
                      </span>
                    ))}
                    {video.sanctionType && video.sanctionType !== 'NO_CARD' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-semibold">
                        {video.sanctionType.includes('YELLOW') && 'YC'}
                        {video.sanctionType.includes('RED') && 'RC'}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(video)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(video.id, video.title)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-text-primary hover:bg-dark-700 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    pagination.page === pageNum
                      ? "bg-cyan-500 text-dark-900"
                      : "bg-dark-800 border border-dark-600 text-text-primary hover:bg-dark-700 hover:border-cyan-500/50"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-text-primary hover:bg-dark-700 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
