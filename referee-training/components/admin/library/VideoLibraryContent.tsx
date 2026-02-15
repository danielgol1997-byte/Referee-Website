"use client";

import { useState, useEffect } from "react";
import { VideoUploadForm } from "./VideoUploadForm";
import { VideoListManager } from "./VideoListManager";
import { TagManager } from "./TagManager";
import { AdminVideoFilters } from "./AdminVideoFilterBar";

type SubTab = 'videos' | 'upload' | 'tags';

export function VideoLibraryContent() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [videoCategories, setVideoCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagCategories, setTagCategories] = useState<any[]>([]);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [filters, setFilters] = useState<AdminVideoFilters>({
    search: '',
    activeStatus: 'all',
    usageStatus: 'all',
    customTagFilters: {},
  });

  const fetchVideos = async (page = 1, activeFilters = filters) => {
    try {
      setIsLoadingVideos(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (activeFilters.search.trim()) {
        params.set('search', activeFilters.search.trim());
      }
      if (activeFilters.activeStatus !== 'all') {
        params.set('isActive', String(activeFilters.activeStatus === 'active'));
      }
      if (activeFilters.usageStatus !== 'all') {
        params.set('usageStatus', activeFilters.usageStatus);
      }
      const hasCustomTagFilters = Object.values(activeFilters.customTagFilters || {}).some(values => values.length > 0);
      if (hasCustomTagFilters) {
        params.set('customTagFilters', JSON.stringify(activeFilters.customTagFilters));
      }

      const videosRes = await fetch(`/api/admin/library/videos?${params}`);
      const videosData = await videosRes.json();
      
      setVideos(videosData.videos || []);
      setPagination(videosData.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      setIsLoadingTags(true);
      const [categoriesRes, tagsRes, tagCategoriesRes] = await Promise.all([
        fetch('/api/admin/library/categories'),
        fetch('/api/admin/library/tags'),
        fetch('/api/admin/library/tag-categories'),
      ]);

      if (!tagsRes.ok) {
        console.error('Failed to fetch tags:', tagsRes.status);
      }
      if (!tagCategoriesRes.ok) {
        console.error('Failed to fetch tag categories:', tagCategoriesRes.status);
      }

      const tagsData = tagsRes.ok ? await tagsRes.json() : { tags: [] };
      const tagCategoriesData = tagCategoriesRes.ok ? await tagCategoriesRes.json() : { tagCategories: [] };
      
      let categoriesData = { categories: [] };
      if (categoriesRes.ok) {
        categoriesData = await categoriesRes.json();
      } else {
        console.error('Failed to fetch categories:', categoriesRes.status);
      }

      setVideoCategories(categoriesData.categories || []);
      setTags(tagsData.tags || []);
      setTagCategories(tagCategoriesData.tagCategories || []);
    } catch (error) {
      console.error('Error fetching categories/tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchCategoriesAndTags(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchVideos(1, filters);
  }, [filters]);

  const handleEditVideo = async (video: any) => {
    // Fetch full video details when editing
    try {
      const response = await fetch(`/api/admin/library/videos/${video.id}`);
      if (response.ok) {
        const data = await response.json();
        setEditingVideo(data.video);
        setActiveSubTab('upload');
      } else {
        let errorDetails = '';
        try {
          const errorJson = await response.json();
          errorDetails = errorJson?.error || JSON.stringify(errorJson);
        } catch {
          errorDetails = await response.text();
        }
        console.error('Failed to fetch full video details:', response.status, errorDetails);
        // Fallback to lightweight data if fetch fails
        setEditingVideo(video);
        setActiveSubTab('upload');
      }
    } catch (error) {
      console.error('Error fetching video details:', error);
      // Fallback to lightweight data
      setEditingVideo(video);
      setActiveSubTab('upload');
    }
  };

  const handleUploadSuccess = () => {
    setEditingVideo(null);
    setActiveSubTab('videos');
    fetchVideos(pagination.page);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos(videos.filter(v => v.id !== videoId));
  };

  const handleVideoUpdate = (videoId: string, updates: Partial<any>) => {
    setVideos(prevVideos => {
      const updatedVideos = prevVideos.map(v => 
        v.id === videoId ? { ...v, ...updates } : v
      );
      
      // Re-sort the videos to match the server-side ordering
      return updatedVideos.sort((a, b) => {
        // Active videos first, then by featured, then by creation date
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl">
        <button
          onClick={() => {
            setActiveSubTab('videos');
            setEditingVideo(null);
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeSubTab === 'videos'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          Videos ({pagination.total})
        </button>
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeSubTab === 'upload'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          {editingVideo ? 'Edit Video' : 'Upload Video'}
        </button>
        <button
          onClick={() => {
            setActiveSubTab('tags');
            setEditingVideo(null);
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeSubTab === 'tags'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          Tags ({tags.length})
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'videos' && (
        <>
          {isLoadingVideos ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-text-secondary">
                <img
                  src="/logo/whistle-chrome-liquid.gif"
                  alt="Loading videos"
                  className="h-24 w-24 object-contain"
                />
                <span className="text-sm font-medium">Loading videos…</span>
              </div>
            </div>
          ) : (
            <VideoListManager
              videos={videos}
              filters={filters}
              onFiltersChange={setFilters}
              onEdit={handleEditVideo}
              onDelete={handleDeleteVideo}
              onRefresh={() => fetchVideos(pagination.page, filters)}
              onVideoUpdate={handleVideoUpdate}
              pagination={pagination}
              onPageChange={(page) => {
                fetchVideos(page, filters);
              }}
            />
          )}
        </>
      )}

      {activeSubTab === 'upload' && (
        <VideoUploadForm
          videoCategories={videoCategories}
          tags={tags}
          tagCategories={tagCategories}
          onSuccess={handleUploadSuccess}
          editingVideo={editingVideo}
        />
      )}

      {activeSubTab === 'tags' && (
        <>
          {isLoadingTags ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-text-secondary">
                <img
                  src="/logo/whistle-chrome-liquid.gif"
                  alt="Loading tags"
                  className="h-24 w-24 object-contain"
                />
                <span className="text-sm font-medium">Loading tags…</span>
              </div>
            </div>
          ) : (
            <TagManager
              tags={tags}
              tagCategories={tagCategories}
              onRefresh={fetchData}
            />
          )}
        </>
      )}
    </div>
  );
}
