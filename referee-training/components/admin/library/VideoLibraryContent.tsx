"use client";

import { useState, useEffect } from "react";
import { VideoUploadForm } from "./VideoUploadForm";
import { VideoListManager } from "./VideoListManager";
import { TagManager } from "./TagManager";
import { RAPCategoryMapper } from "./RAPCategoryMapper";

type SubTab = 'videos' | 'upload' | 'tags' | 'rap-mapping';

export function VideoLibraryContent() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [videoCategories, setVideoCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagCategories, setTagCategories] = useState<any[]>([]);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVideos = async (page = 1, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) {
        params.append('search', search);
      }

      const videosRes = await fetch(`/api/admin/library/videos?${params}`);
      const videosData = await videosRes.json();
      
      setVideos(videosData.videos || []);
      setPagination(videosData.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesRes, tagsRes, tagCategoriesRes] = await Promise.all([
        fetch('/api/admin/library/categories'),
        fetch('/api/admin/library/tags'),
        fetch('/api/admin/library/tag-categories'),
      ]);

      const tagsData = await tagsRes.json();
      const tagCategoriesData = await tagCategoriesRes.json();
      
      let categoriesData = { categories: [] };
      if (categoriesRes.ok) {
        categoriesData = await categoriesRes.json();
      }

      setVideoCategories(categoriesData.categories || []);
      setTags(tagsData.tags || []);
      setTagCategories(tagCategoriesData.tagCategories || []);
    } catch (error) {
      console.error('Error fetching categories/tags:', error);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchVideos(1, searchQuery),
        fetchCategoriesAndTags(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditVideo = async (video: any) => {
    // Fetch full video details when editing
    try {
      const response = await fetch(`/api/admin/library/videos/${video.id}`);
      if (response.ok) {
        const data = await response.json();
        setEditingVideo(data.video);
        setActiveSubTab('upload');
      } else {
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
    fetchVideos(pagination.page, searchQuery);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos(videos.filter(v => v.id !== videoId));
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
          Videos ({videos.length})
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
        <button
          onClick={() => {
            setActiveSubTab('rap-mapping');
            setEditingVideo(null);
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
            activeSubTab === 'rap-mapping'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          RAP Mapping
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'videos' && (
        <VideoListManager
          videos={videos}
          onEdit={handleEditVideo}
          onDelete={handleDeleteVideo}
          onRefresh={() => fetchVideos(pagination.page, searchQuery)}
          pagination={pagination}
          onPageChange={(page) => {
            fetchVideos(page, searchQuery);
          }}
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            fetchVideos(1, query);
          }}
        />
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
        <TagManager
          tags={tags}
          tagCategories={tagCategories}
          onRefresh={fetchData}
        />
      )}

      {activeSubTab === 'rap-mapping' && (
        <RAPCategoryMapper
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
