"use client";

import { useState, useEffect } from "react";
import { VideoUploadForm } from "./VideoUploadForm";
import { VideoListManager } from "./VideoListManager";
import { TagManager } from "./TagManager";

type SubTab = 'videos' | 'upload' | 'tags';

export function VideoLibraryContent() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [videoCategories, setVideoCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [videosRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/admin/library/videos'),
        fetch('/api/library/videos/search?q='),
        fetch('/api/admin/library/tags'),
      ]);

      const videosData = await videosRes.json();
      const tagsData = await tagsRes.json();
      
      // Get video categories
      const categoriesResponse = await fetch('/api/admin/library/categories');
      let categoriesData = { categories: [] };
      if (categoriesResponse.ok) {
        categoriesData = await categoriesResponse.json();
      }

      setVideos(videosData.videos || []);
      setVideoCategories(categoriesData.categories || []);
      setTags(tagsData.tags || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditVideo = (video: any) => {
    setEditingVideo(video);
    setActiveSubTab('upload');
  };

  const handleUploadSuccess = () => {
    setEditingVideo(null);
    setActiveSubTab('videos');
    fetchData();
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos(videos.filter(v => v.id !== videoId));
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-text-secondary">Loading video library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl">
        <button
          onClick={() => {
            setActiveSubTab('videos');
            setEditingVideo(null);
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'videos'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          📹 Videos ({videos.length})
        </button>
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'upload'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          {editingVideo ? '✏️ Edit Video' : '⬆️ Upload Video'}
        </button>
        <button
          onClick={() => {
            setActiveSubTab('tags');
            setEditingVideo(null);
          }}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'tags'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-dark-700'
          }`}
        >
          🏷️ Tags ({tags.length})
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'videos' && (
        <VideoListManager
          videos={videos}
          onEdit={handleEditVideo}
          onDelete={handleDeleteVideo}
          onRefresh={fetchData}
        />
      )}

      {activeSubTab === 'upload' && (
        <VideoUploadForm
          videoCategories={videoCategories}
          tags={tags}
          onSuccess={handleUploadSuccess}
          editingVideo={editingVideo}
        />
      )}

      {activeSubTab === 'tags' && (
        <TagManager
          tags={tags}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
