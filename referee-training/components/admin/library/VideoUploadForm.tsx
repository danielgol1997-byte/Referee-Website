"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getClientUploadConfig, getThumbnailUrl } from "@/lib/cloudinary-client";

interface VideoUploadFormProps {
  videoCategories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; color?: string; category?: string; parentCategory?: string }>;
  onSuccess?: () => void;
  editingVideo?: any;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
  category?: string;
  parentCategory?: string;
}

const LAWS = Array.from({ length: 17 }, (_, i) => ({ value: i + 1, label: `Law ${i + 1}` }));

// Tag group colors
const GROUP_COLORS: Record<string, string> = {
  CATEGORY: '#FF6B6B',
  RESTARTS: '#4A90E2',
  CRITERIA: '#FFD93D',
  SANCTION: '#EC4899',
  SCENARIO: '#6BCF7F',
};

export function VideoUploadForm({ videoCategories, tags, onSuccess, editingVideo }: VideoUploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(editingVideo?.fileUrl || '');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(editingVideo?.thumbnailUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form data
  const [title, setTitle] = useState(editingVideo?.title || '');
  const [description, setDescription] = useState(editingVideo?.description || '');
  const [selectedLaws, setSelectedLaws] = useState<number[]>(editingVideo?.lawNumbers || []);
  const [playOn, setPlayOn] = useState(editingVideo?.playOn || false);
  const [noOffence, setNoOffence] = useState(editingVideo?.noOffence || false);
  const [correctDecisionTags, setCorrectDecisionTags] = useState<Tag[]>([]);
  const [invisibleTags, setInvisibleTags] = useState<Tag[]>([]);

  // Load tags when editing video
  useEffect(() => {
    if (editingVideo?.tags && Array.isArray(editingVideo.tags)) {
      const videoTags = editingVideo.tags
        .map((vt: any) => {
          const tag = tags.find(t => t.id === (vt.tagId || vt.tag?.id));
          return tag ? { ...tag, order: vt.decisionOrder || 0, isCorrect: vt.isCorrectDecision || false } : null;
        })
        .filter((t: any) => t !== null);

      const correct = videoTags.filter((t: any) => t.isCorrect).sort((a: any, b: any) => a.order - b.order);
      const invisible = videoTags.filter((t: any) => !t.isCorrect);

      setCorrectDecisionTags(correct);
      setInvisibleTags(invisible);
    }
  }, [editingVideo, tags]);

  // Group tags by category
  const tagGroups = tags.reduce((acc, tag) => {
    if (!acc[tag.category || 'OTHER']) {
      acc[tag.category || 'OTHER'] = [];
    }
    acc[tag.category || 'OTHER'].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Get unique tag categories (dynamically)
  const tagCategories = Object.keys(tagGroups).filter(cat => cat !== 'OTHER');

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Set filename as default title
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const captureThumbnail = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(blob));
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!videoFile && !editingVideo)) {
      alert('Please provide a title and video file');
      return;
    }

    setLoading(true);
    try {
      let fileUrl = editingVideo?.fileUrl || '';
      let thumbnailUrl = editingVideo?.thumbnailUrl || '';
      let duration = editingVideo?.duration || 0;

      // Upload video if new file
      if (videoFile) {
        console.log('Uploading video file:', videoFile.name, 'Size:', videoFile.size);
        
        const cloudConfig = getClientUploadConfig();
        const canDirectUpload = !!cloudConfig?.cloudName && !!cloudConfig?.uploadPreset;
        const allowServerFallback = process.env.NODE_ENV !== "production";

        const uploadViaServer = async () => {
          const uploadFormData = new FormData();
          uploadFormData.append('video', videoFile);

          const uploadResponse = await fetch('/api/admin/library/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          console.log('Upload response status:', uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            let errorMessage = `Upload failed with status ${uploadResponse.status}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData?.error || errorMessage;
              console.error('Server error response:', errorData);
            } catch (parseError) {
              console.error('Could not parse error response:', parseError);
              console.error('Error response text:', errorText);
              if (uploadResponse.status === 403) {
                errorMessage = "Upload forbidden by Vercel. Configure client-side Cloudinary upload (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) to bypass Vercel limits.";
              } else {
                errorMessage = errorText || errorMessage;
              }
            }
            throw new Error(errorMessage);
          }

          const uploadResult = await uploadResponse.json();
          console.log('Upload successful:', uploadResult);
          
          if (!uploadResult.video || !uploadResult.video.url) {
            throw new Error('Upload response missing video URL');
          }
          
          fileUrl = uploadResult.video.url;
          thumbnailUrl = uploadResult.video.thumbnailUrl;
          duration = uploadResult.video.duration;
        };

        if (canDirectUpload) {
          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/video/upload`;
          const uploadFormData = new FormData();
          uploadFormData.append('file', videoFile);
          uploadFormData.append('upload_preset', cloudConfig.uploadPreset);

          const uploadResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: uploadFormData,
          });

          console.log('Upload response status:', uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            let errorMessage = `Upload failed with status ${uploadResponse.status}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
              console.error('Server error response:', errorData);
            } catch (parseError) {
              console.error('Could not parse error response:', parseError);
              console.error('Error response text:', errorText);
              if (uploadResponse.status === 403) {
                errorMessage = "Forbidden by Cloudinary. Check that the upload preset exists and is UNSIGNED, and that it allows video uploads.";
              } else {
                errorMessage = errorText || errorMessage;
              }
            }
            if (errorMessage.toLowerCase().includes("upload preset not found")) {
              console.warn("Upload preset not found. Falling back to server-side upload.");
              await uploadViaServer();
              return;
            }
            throw new Error(errorMessage);
          }

          const uploadResult = await uploadResponse.json();
          console.log('Upload successful:', uploadResult);

          if (!uploadResult?.secure_url || !uploadResult?.public_id) {
            throw new Error('Upload response missing Cloudinary URL');
          }

          fileUrl = uploadResult.secure_url;
          thumbnailUrl = getThumbnailUrl(uploadResult.public_id);
          duration = uploadResult.duration || 0;
        } else if (allowServerFallback) {
          await uploadViaServer();
        } else {
          throw new Error(
            "Cloudinary client upload is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in Vercel."
          );
        }
      }

      // Upload custom thumbnail if captured
      if (thumbnailFile) {
        console.log('📸 Uploading custom thumbnail...');
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('thumbnail', thumbnailFile);

        const thumbnailResponse = await fetch('/api/admin/library/upload/thumbnail', {
          method: 'POST',
          body: thumbnailFormData,
        });

        if (thumbnailResponse.ok) {
          const thumbnailResult = await thumbnailResponse.json();
          thumbnailUrl = thumbnailResult.thumbnailUrl;
          console.log('✅ Custom thumbnail uploaded:', thumbnailUrl);
        } else {
          console.warn('⚠️ Custom thumbnail upload failed, using auto-generated');
        }
      }

      // Prepare tag data with correct decision ordering
      const correctDecisionTagData = correctDecisionTags.map((tag, index) => ({
        tagId: tag.id,
        isCorrectDecision: true,
        decisionOrder: index + 1,
      }));

      const invisibleTagData = invisibleTags.map(tag => ({
        tagId: tag.id,
        isCorrectDecision: false,
        decisionOrder: 0,
      }));

      const allTagData = [...correctDecisionTagData, ...invisibleTagData];
      
      const videoData = {
        title,
        description,
        fileUrl,
        thumbnailUrl,
        duration,
        // Don't pass categoryId - let the backend handle it
        videoCategoryId: videoCategories[0]?.id || null,
        lawNumbers: selectedLaws,
        playOn,
        noOffence,
        tagData: allTagData, // Send structured tag data with order and type
        isActive: true,
      };

      const url = editingVideo 
        ? `/api/admin/library/videos/${editingVideo.id}`
        : '/api/admin/library/videos';
      
      const method = editingVideo ? 'PUT' : 'POST';

      console.log('📝 Creating video record with data:', {
        title: videoData.title,
        fileUrl: videoData.fileUrl,
        thumbnailUrl: videoData.thumbnailUrl,
        tagCount: videoData.tagData.length,
        correctDecisionTags: correctDecisionTags.length,
        invisibleTags: invisibleTags.length,
        lawCount: videoData.lawNumbers.length,
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoData),
      });

      console.log('Video creation response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Failed to save video (${response.status})`;
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
          console.error('Server error creating video:', error);
        } catch (parseError) {
          const textError = await response.text();
          console.error('Error response text:', textError);
          errorMessage = textError || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Video created successfully:', result);

      alert(editingVideo ? 'Video updated successfully!' : 'Video uploaded successfully!');
      
      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoPreview('');
      setThumbnailPreview('');
      setTitle('');
      setDescription('');
      setSelectedLaws([]);
      setCorrectDecisionTags([]);
      setInvisibleTags([]);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Failed to upload video. Please check console for details.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video Upload Section */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Upload Video</h3>
        
        {!videoPreview ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
              isDragging 
                ? "border-cyan-500 bg-cyan-500/10" 
                : "border-dark-600 hover:border-cyan-500/50 hover:bg-dark-700/50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-text-primary mb-2">
              Drop your video here or click to browse
            </p>
            <p className="text-sm text-text-muted">
              Supports MP4, MOV, AVI, and other video formats
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoPreview}
                crossOrigin="anonymous"
                controls
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={captureThumbnail}
                className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20 transition-colors text-sm font-medium"
              >
                Set Current Frame as Thumbnail
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview('');
                  setThumbnailPreview('');
                }}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors text-sm font-medium"
              >
                Remove Video
              </button>
            </div>

            {thumbnailPreview && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-900/50 border border-dark-600">
                <img src={thumbnailPreview} alt="Thumbnail" className="w-32 h-18 rounded object-cover" />
                <span className="text-sm text-text-secondary">Custom thumbnail set</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="Add a description for this video..."
            />
          </div>
        </div>
      </div>

      {/* Tagging Section */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Tagging</h3>
        
        <div className="space-y-6">
          {/* Laws of the Game */}
          <TagDropdown
            label="Laws of the Game"
            color="#9B72CB"
            options={LAWS.map(l => ({ id: l.value.toString(), name: l.label, color: '#9B72CB' }))}
            selected={LAWS.filter(l => selectedLaws.includes(l.value)).map(l => ({ id: l.value.toString(), name: l.label, color: '#9B72CB' }))}
            onSelect={(tag) => {
              const lawNum = parseInt(tag.id);
              if (!selectedLaws.includes(lawNum)) {
                setSelectedLaws([...selectedLaws, lawNum]);
              }
            }}
            onRemove={(tag) => {
              const lawNum = parseInt(tag.id);
              setSelectedLaws(selectedLaws.filter(l => l !== lawNum));
            }}
          />

          {/* Dynamic Tag Group Dropdowns */}
          {tagCategories.map(category => {
            let filteredOptions = tagGroups[category] || [];
            
            // For CRITERIA tags, filter based on selected CATEGORY tags
            if (category === 'CRITERIA') {
              const selectedCategoryNames = [...correctDecisionTags, ...invisibleTags]
                .filter(t => t.category === 'CATEGORY')
                .map(t => t.name);
              
              // Only show criteria that belong to selected categories
              if (selectedCategoryNames.length > 0) {
                filteredOptions = filteredOptions.filter(tag => 
                  tag.parentCategory && selectedCategoryNames.includes(tag.parentCategory)
                );
              }
            }
            
            return (
              <TagDropdown
                key={category}
                label={category.charAt(0) + category.slice(1).toLowerCase()}
                color={GROUP_COLORS[category] || '#00E8F8'}
                options={filteredOptions}
                selected={[...correctDecisionTags, ...invisibleTags].filter(t => t.category === category)}
                onSelect={(tag) => {
                  if (![...correctDecisionTags, ...invisibleTags].find(t => t.id === tag.id)) {
                    setInvisibleTags([...invisibleTags, tag]);
                  }
                }}
                onRemove={(tag) => {
                  setCorrectDecisionTags(correctDecisionTags.filter(t => t.id !== tag.id));
                  setInvisibleTags(invisibleTags.filter(t => t.id !== tag.id));
                }}
              />
            );
          })}

          {/* Correct Decision Section */}
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 p-6">
            <h4 className="text-md font-semibold text-cyan-400 mb-3">Correct Decision Tags</h4>
            <p className="text-sm text-text-muted mb-4">
              These tags will be displayed as the correct answer when users view this video. Drag to reorder.
            </p>
            
            {/* Play On / No Offence Toggles */}
            <div className="flex gap-4 mb-4 p-4 bg-dark-900/50 rounded-lg border border-cyan-500/20">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playOn}
                  onChange={(e) => {
                    setPlayOn(e.target.checked);
                    if (e.target.checked) setNoOffence(false);
                  }}
                  className="w-5 h-5 rounded border-cyan-500/50 bg-dark-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-dark-900"
                />
                <span className={cn(
                  "font-semibold text-sm uppercase tracking-wider transition-colors",
                  playOn ? "text-cyan-400" : "text-slate-600"
                )}>
                  Play On
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noOffence}
                  onChange={(e) => {
                    setNoOffence(e.target.checked);
                    if (e.target.checked) setPlayOn(false);
                  }}
                  className="w-5 h-5 rounded border-cyan-500/50 bg-dark-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-dark-900"
                />
                <span className={cn(
                  "font-semibold text-sm uppercase tracking-wider transition-colors",
                  noOffence ? "text-cyan-400" : "text-slate-600"
                )}>
                  No Offence
                </span>
              </label>
              <p className="text-xs text-text-muted ml-auto self-center">
                When enabled, this will be displayed as the title above the answer sections
              </p>
            </div>
            
            <CorrectDecisionList
              tags={correctDecisionTags}
              allTags={[...correctDecisionTags, ...invisibleTags]}
              onReorder={setCorrectDecisionTags}
              onMove={(tag) => {
                setInvisibleTags(invisibleTags.filter(t => t.id !== tag.id));
                setCorrectDecisionTags([...correctDecisionTags, tag]);
              }}
              onRemove={(tag) => {
                setCorrectDecisionTags(correctDecisionTags.filter(t => t.id !== tag.id));
                setInvisibleTags([...invisibleTags, tag]);
              }}
            />
          </div>

          {/* Invisible Tags Section */}
          <div className="rounded-xl bg-dark-900/50 border border-dark-600 p-6">
            <h4 className="text-md font-semibold text-text-secondary mb-3">Filter Tags (Invisible)</h4>
            <p className="text-sm text-text-muted mb-4">
              These tags help filter videos but won't be shown as correct answers.
            </p>
            
            <InvisibleTagsList
              tags={invisibleTags}
              onRemove={(tag) => setInvisibleTags(invisibleTags.filter(t => t.id !== tag.id))}
              onMoveToCorrect={(tag) => {
                setInvisibleTags(invisibleTags.filter(t => t.id !== tag.id));
                setCorrectDecisionTags([...correctDecisionTags, tag]);
              }}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onSuccess?.()}
          className="px-6 py-3 rounded-lg bg-dark-700 border border-dark-600 text-text-primary hover:bg-dark-600 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : (editingVideo ? 'Update Video' : 'Upload Video')}
        </button>
      </div>

      {/* Hidden canvas for thumbnail capture */}
      <canvas ref={canvasRef} className="hidden" />
    </form>
  );
}

// Tag Dropdown Component
function TagDropdown({ 
  label, 
  color, 
  options, 
  selected, 
  onSelect, 
  onRemove 
}: { 
  label: string; 
  color: string; 
  options: Tag[]; 
  selected: Tag[]; 
  onSelect: (tag: Tag) => void; 
  onRemove: (tag: Tag) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selected.find(s => s.id === opt.id)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-dark-900 border-2 text-text-primary focus:outline-none transition-all"
          style={{ borderColor: color }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm">{selected.length > 0 ? `${selected.length} selected` : `Select ${label}...`}</span>
          </div>
          <svg 
            className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-dark-900 border-2 rounded-lg shadow-2xl max-h-80 overflow-y-auto" style={{ borderColor: color }}>
            {/* Search Bar */}
            <div className="sticky top-0 p-3 bg-dark-900 border-b border-dark-600">
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 text-text-primary text-sm focus:outline-none focus:border-cyan-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options */}
            <div className="p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSelect(option);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-800 transition-colors text-left"
                  >
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: option.color || color }} 
                    />
                    <span className="text-sm text-text-primary">{option.name}</span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-text-muted text-center py-4">No options found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm"
              style={{ borderColor: tag.color || color, backgroundColor: `${tag.color || color}15` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || color }} />
              <span className="text-text-primary">{tag.name}</span>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-1 text-text-muted hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Correct Decision List Component
function CorrectDecisionList({ 
  tags, 
  allTags,
  onReorder,
  onMove,
  onRemove
}: { 
  tags: Tag[]; 
  allTags: Tag[];
  onReorder: (tags: Tag[]) => void;
  onMove: (tag: Tag) => void;
  onRemove: (tag: Tag) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTags = [...tags];
    const draggedTag = newTags[draggedIndex];
    newTags.splice(draggedIndex, 1);
    newTags.splice(index, 0, draggedTag);

    onReorder(newTags);
    setDraggedIndex(index);
  };

  const invisibleTags = allTags.filter(t => !tags.find(ct => ct.id === t.id));

  return (
    <div className="space-y-3">
      {tags.length > 0 ? (
        tags.map((tag, index) => (
          <div
            key={tag.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={() => setDraggedIndex(null)}
            className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 border-2 border-cyan-500/50 cursor-move hover:bg-dark-800 transition-colors"
          >
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: tag.color }} />
            <span className="flex-1 text-text-primary font-medium">{tag.name}</span>
            <span className="text-xs text-cyan-400 font-medium">#{index + 1}</span>
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="text-amber-500 hover:text-amber-400 transition-colors"
              title="Move to Filter Tags"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm">No correct decision tags selected yet</p>
          <p className="text-xs mt-1">Select tags from the dropdowns above and drag them here</p>
        </div>
      )}

      {/* Quick add from invisible tags */}
      {invisibleTags.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-cyan-500 cursor-pointer hover:text-cyan-400">
            + Quick add from other tags ({invisibleTags.length})
          </summary>
          <div className="flex flex-wrap gap-2 mt-3">
            {invisibleTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => onMove(tag)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-600 hover:border-cyan-500 transition-colors text-sm"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-text-primary">{tag.name}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// Invisible Tags List Component
function InvisibleTagsList({ 
  tags, 
  onRemove,
  onMoveToCorrect
}: { 
  tags: Tag[]; 
  onRemove: (tag: Tag) => void;
  onMoveToCorrect: (tag: Tag) => void;
}) {
  return (
    <div className="space-y-2">
      {tags.length > 0 ? (
        tags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-600 hover:border-dark-500 transition-colors"
          >
            <div className="w-4 h-4 rounded" style={{ backgroundColor: tag.color }} />
            <span className="flex-1 text-text-primary">{tag.name}</span>
            <button
              type="button"
              onClick={() => onMoveToCorrect(tag)}
              className="text-cyan-500 hover:text-cyan-400 transition-colors text-xs font-medium"
            >
              Move to Correct
            </button>
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))
      ) : (
        <p className="text-center py-4 text-text-muted text-sm">No filter tags selected</p>
      )}
    </div>
  );
}
