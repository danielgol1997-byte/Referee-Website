"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useModal } from "@/components/ui/modal";
import { getClientUploadConfig, getThumbnailUrl, uploadVideoClient, uploadImageClient } from "@/lib/cloudinary-client";
import { VideoEditor, VideoEditData } from "./VideoEditor";
import { UploadProgress } from "./UploadProgress";

interface VideoUploadFormProps {
  videoCategories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{
    id: string;
    name: string;
    color?: string;
    category?: { id: string; name: string; slug: string; canBeCorrectAnswer: boolean; order?: number };
    parentCategory?: string;
  }>;
  tagCategories: Array<{
    id: string;
    name: string;
    slug: string;
    canBeCorrectAnswer: boolean;
    order?: number;
  }>;
  onSuccess?: () => void;
  editingVideo?: any;
}

interface TagCategory {
  id: string;
  name: string;
  slug: string;
  canBeCorrectAnswer: boolean;
  order?: number;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
  category?: TagCategory;
  parentCategory?: string;
}

// Tag group colors
const GROUP_COLORS: Record<string, string> = {
  category: '#FF6B6B',
  restarts: '#4A90E2',
  criteria: '#FFD93D',
  sanction: '#EC4899',
  scenario: '#6BCF7F',
};

const CATEGORY_TAG_CATEGORY_SLUG = 'category';
const CRITERIA_TAG_CATEGORY_SLUG = 'criteria';

export function VideoUploadForm({ videoCategories, tags, tagCategories, onSuccess, editingVideo }: VideoUploadFormProps) {
  const modal = useModal();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(editingVideo?.fileUrl || '');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(editingVideo?.thumbnailUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(editingVideo?.duration || 0);
  const [videoEditData, setVideoEditData] = useState<VideoEditData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressOverlayRef = useRef<HTMLDivElement>(null);

  // Form data
  const [uploadMode, setUploadMode] = useState<'decisions' | 'explanations'>(
    editingVideo?.isEducational ? 'explanations' : 'decisions'
  );
  const [title, setTitle] = useState(editingVideo?.title || '');
  const [decisionExplanation, setDecisionExplanation] = useState(editingVideo?.decisionExplanation || '');
  const [playOn, setPlayOn] = useState(editingVideo?.playOn || false);
  const [noOffence, setNoOffence] = useState(editingVideo?.noOffence || false);
  const [isActive, setIsActive] = useState(editingVideo?.isActive !== undefined ? editingVideo.isActive : true);
  const [correctDecisionTags, setCorrectDecisionTags] = useState<Tag[]>([]);
  const [invisibleTags, setInvisibleTags] = useState<Tag[]>([]);

  const buildEditPayload = (editData: VideoEditData | null) => {
    if (!editData) return null;
    return {
      trimStart: editData.trimStart,
      trimEnd: editData.trimEnd,
      cutSegments: [],
    };
  };

  const hasMeaningfulEdits = (
    editPayload: { trimStart?: number; trimEnd?: number; cutSegments?: Array<{ start: number; end: number }> } | null,
    durationValue: number
  ) => {
    if (!editPayload) return false;
    const trimStart = Math.max(0, Number(editPayload.trimStart) || 0);
    const durationSafe = Number.isFinite(durationValue) && durationValue > 0;
    const trimEnd = Number.isFinite(editPayload.trimEnd)
      ? (editPayload.trimEnd as number)
      : durationSafe
        ? durationValue
        : undefined;
    const hasTrim = trimStart > 0 || (durationSafe && trimEnd !== undefined && trimEnd < durationValue - 0.001);
    return hasTrim || (!durationSafe && trimEnd !== undefined && trimEnd > trimStart);
  };

  const getAdjustedLoop = (
    editData: VideoEditData | null,
    finalDuration: number
  ) => {
    if (!editData || !Number.isFinite(finalDuration) || finalDuration <= 0) {
      return { loopZoneStart: editData?.loopZoneStart, loopZoneEnd: editData?.loopZoneEnd };
    }

    const hasLoop =
      Number.isFinite(editData.loopZoneStart) &&
      Number.isFinite(editData.loopZoneEnd);

    if (!hasLoop) {
      return { loopZoneStart: editData?.loopZoneStart, loopZoneEnd: editData?.loopZoneEnd };
    }

    const trimStart = Math.max(0, Number(editData.trimStart) || 0);
    const trimEnd = Number.isFinite(editData.trimEnd) ? (editData.trimEnd as number) : Infinity;
    
    // Check if the loop is within the trim region (on original timeline)
    const loopStart = editData.loopZoneStart as number;
    const loopEnd = editData.loopZoneEnd as number;
    
    // If the loop is entirely outside the trim region, discard it
    if (loopStart >= trimEnd || loopEnd <= trimStart) {
      console.log('Loop is outside trim region, discarding:', { loopStart, loopEnd, trimStart, trimEnd });
      return { loopZoneStart: null, loopZoneEnd: null };
    }
    
    // Clamp loop to trim region first (on original timeline), then convert to new timeline
    const clampedLoopStart = Math.max(trimStart, Math.min(loopStart, trimEnd));
    const clampedLoopEnd = Math.max(trimStart, Math.min(loopEnd, trimEnd));
    
    // Convert from original timeline to new (trimmed) timeline
    const loopStartRaw = clampedLoopStart - trimStart;
    const loopEndRaw = clampedLoopEnd - trimStart;

    // Final clamp to the new video duration (safety check)
    const loopZoneStart = Math.max(0, Math.min(loopStartRaw, finalDuration));
    const loopZoneEnd = Math.max(0, Math.min(loopEndRaw, finalDuration));

    // If the loop is too short after all adjustments, discard it
    if (loopZoneEnd - loopZoneStart < 0.1) {
      console.log('Loop too short after adjustment, discarding:', { loopZoneStart, loopZoneEnd });
      return { loopZoneStart: null, loopZoneEnd: null };
    }

    console.log('Adjusted loop:', { 
      original: { loopStart, loopEnd }, 
      trimRegion: { trimStart, trimEnd },
      clamped: { clampedLoopStart, clampedLoopEnd },
      final: { loopZoneStart, loopZoneEnd, finalDuration }
    });

    return { loopZoneStart, loopZoneEnd };
  };

  // Load video metadata when editing (for videos uploaded before editor feature)
  useEffect(() => {
    if (editingVideo?.fileUrl && videoPreview && (!videoDuration || videoDuration === 0)) {
      console.log('Loading video metadata for existing video:', editingVideo.fileUrl);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, duration:', video.duration);
        setVideoDuration(video.duration);
      };
      video.onerror = (e) => {
        console.error('Error loading video metadata:', e);
      };
      video.src = editingVideo.fileUrl;
    }
  }, [editingVideo?.fileUrl, videoPreview, videoDuration]);

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

  useEffect(() => {
    if (editingVideo) {
      setDecisionExplanation(editingVideo.decisionExplanation || '');
      setUploadMode(editingVideo.isEducational ? 'explanations' : 'decisions');
    }
  }, [editingVideo]);

  const effectiveIsEducational = uploadMode === 'explanations';

  // Group tags by category
  const tagGroups = tags.reduce((acc, tag) => {
    const categoryId = tag.category?.id || 'other';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Get unique tag categories (from props, already sorted)
  const sortedTagCategories = tagCategories.sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

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
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Set filename as default title
      
      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        // DO NOT revoke the blob URL - it's still needed by VideoEditor
        // URL.revokeObjectURL(video.src);
      };
      video.src = url;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      
      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        // DO NOT revoke the blob URL - it's still needed by VideoEditor
      };
      video.src = url;
    }
  };

  const captureThumbnail = () => {
    // Use the VideoEditor's video element if available, otherwise use hidden thumbnail video
    const videoElement = document.querySelector('video[src="' + videoPreview + '"]') as HTMLVideoElement || thumbnailVideoRef.current;
    
    if (videoElement && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
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

  const initialEdit = useMemo(() => {
    if (!editingVideo) return undefined;
    return {
      trimStart: editingVideo.trimStart || 0,
      trimEnd: editingVideo.trimEnd || videoDuration,
      cutSegments: [],
      loopZoneStart: editingVideo.loopZoneStart,
      loopZoneEnd: editingVideo.loopZoneEnd,
    };
  }, [editingVideo, videoDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!videoFile && !editingVideo)) {
      await modal.showError('Please provide a title and video file');
      return;
    }
    if (effectiveIsEducational && !decisionExplanation.trim()) {
      await modal.showError('Please provide an explanation for explanation-only videos.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    // Scroll to progress overlay
    setTimeout(() => {
      progressOverlayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      let fileUrl = editingVideo?.fileUrl || '';
      let thumbnailUrl = editingVideo?.thumbnailUrl || '';
      let duration = editingVideo?.duration || 0;
      const editDataForSave = videoEditData ?? null;
      const editPayload = buildEditPayload(editDataForSave);

      // Upload video if new file
      if (videoFile) {
        console.log('Uploading video file:', videoFile.name, 'Size:', videoFile.size);
        
        const cloudConfig = getClientUploadConfig();
        const canDirectUpload = !!cloudConfig?.cloudName && !!cloudConfig?.uploadPreset;
        const allowServerFallback = process.env.NODE_ENV !== "production";

        const uploadViaServer = async () => {
          const uploadFormData = new FormData();
          uploadFormData.append('video', videoFile);
          if (editPayload) {
            uploadFormData.append('editData', JSON.stringify(editPayload));
          }

          const uploadResult = await new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 90;
                console.log(`Upload progress (server): ${progress.toFixed(1)}% (${e.loaded}/${e.total} bytes)`);
                setUploadProgress(progress);
              }
            });

            xhr.addEventListener('load', () => {
              console.log('Server upload complete, setting progress to 95%');
              setUploadProgress(95);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                  reject(new Error('Failed to parse upload response'));
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Upload failed'));
            });

            xhr.open('POST', '/api/admin/library/upload');
            xhr.send(uploadFormData);
          });

          console.log('Upload successful:', uploadResult);
          
          if (!uploadResult.video || !uploadResult.video.url) {
            throw new Error('Upload response missing video URL');
          }
          
          fileUrl = uploadResult.video.url;
          thumbnailUrl = uploadResult.video.thumbnailUrl;
          duration = uploadResult.video.duration;
          setUploadProgress(100);
        };

        if (canDirectUpload) {
          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/video/upload`;
          const uploadFormData = new FormData();
          uploadFormData.append('file', videoFile);
          uploadFormData.append('upload_preset', cloudConfig.uploadPreset);

          // Use XMLHttpRequest for progress tracking
          const uploadPromise = new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 90; // Reserve 90% for upload
                console.log(`Upload progress: ${progress.toFixed(1)}% (${e.loaded}/${e.total} bytes)`);
                setUploadProgress(progress);
              }
            });

            xhr.addEventListener('load', () => {
              console.log('Upload complete, setting progress to 95%');
              setUploadProgress(95);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  resolve(result);
                } catch (e) {
                  reject(new Error('Failed to parse upload response'));
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Upload failed'));
            });

            xhr.open('POST', cloudinaryUrl);
            console.log('Starting XHR upload to Cloudinary...');
            xhr.send(uploadFormData);
          });

          const uploadResult = await uploadPromise;
          console.log('Upload successful:', uploadResult);

          if (!uploadResult?.secure_url || !uploadResult?.public_id) {
            throw new Error('Upload response missing Cloudinary URL');
          }

          fileUrl = uploadResult.secure_url;
          thumbnailUrl = getThumbnailUrl(uploadResult.public_id);
          duration = uploadResult.duration || 0;
          setUploadProgress(100);

          const hasTrimEdits = editPayload && hasMeaningfulEdits(editPayload, duration);
          if (editPayload && hasTrimEdits) {
            try {
              const editResponse = await fetch('/api/admin/library/upload/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  publicId: uploadResult.public_id,
                  duration,
                  editData: editPayload,
                }),
              });

              if (!editResponse.ok) {
                let errorMessage = `Edit processing failed (${editResponse.status})`;
                try {
                  const errorJson = await editResponse.json();
                  errorMessage = errorJson.error || errorMessage;
                  console.error('Edit API error:', errorJson);
                } catch {
                  const errorText = await editResponse.text();
                  errorMessage = errorText || errorMessage;
                  console.error('Edit API error text:', errorText);
                }
                throw new Error(errorMessage);
              }

              const editResult = await editResponse.json();
              if (!editResult?.edited || !editResult?.video?.url) {
                throw new Error('Edit processing did not produce an edited video');
              }

              fileUrl = editResult.video.url;
              thumbnailUrl = editResult.video.thumbnailUrl || thumbnailUrl;
              
              // Calculate the expected trimmed duration from the edit data
              // Cloudinary's eager transformation response doesn't include duration,
              // so we compute it ourselves from the trim values
              const trimStart = Math.max(0, Number(editPayload.trimStart) || 0);
              const trimEnd = Number.isFinite(editPayload.trimEnd) 
                ? Math.min(editPayload.trimEnd as number, duration)
                : duration;
              const calculatedDuration = Math.max(0, trimEnd - trimStart);
              
              // Use Cloudinary's duration if available, otherwise use calculated
              duration = editResult.video.duration || calculatedDuration;
              
              console.log('📐 Duration calculation:', {
                originalDuration: uploadResult.duration,
                trimStart,
                trimEnd,
                calculatedDuration,
                cloudinaryDuration: editResult.video.duration,
                finalDuration: duration,
              });
            } catch (error) {
              throw error;
            }
          }
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
        try {
          console.log('📸 Uploading custom thumbnail...');
          const cloudConfig = getClientUploadConfig();
          
          if (cloudConfig?.cloudName && cloudConfig?.uploadPreset) {
            // Direct client-side upload
            const thumbnailResult = await uploadImageClient(
              thumbnailFile,
              cloudConfig.uploadPreset,
              cloudConfig.cloudName
            );
            thumbnailUrl = thumbnailResult.secure_url;
            console.log('✅ Custom thumbnail uploaded:', thumbnailUrl);
          } else {
            // Fallback to server upload
            const thumbnailFormData = new FormData();
            thumbnailFormData.append('thumbnail', thumbnailFile);

            const thumbnailResponse = await fetch('/api/admin/library/upload/thumbnail', {
              method: 'POST',
              body: thumbnailFormData,
            });

            if (thumbnailResponse.ok) {
              const thumbnailResult = await thumbnailResponse.json();
              thumbnailUrl = thumbnailResult.thumbnailUrl;
              console.log('✅ Custom thumbnail uploaded (via server):', thumbnailUrl);
            } else {
              console.warn('⚠️ Custom thumbnail upload failed, using auto-generated');
            }
          }
        } catch (error) {
          console.warn('⚠️ Custom thumbnail upload failed:', error, 'using auto-generated');
        }
      }

      const hasDecisionTags = !effectiveIsEducational;
      const correctDecisionTagData = hasDecisionTags
        ? correctDecisionTags.map((tag, index) => ({
            tagId: tag.id,
            isCorrectDecision: true,
            decisionOrder: index + 1,
          }))
        : [];

      const invisibleTagData = invisibleTags.map(tag => ({
        tagId: tag.id,
        isCorrectDecision: false,
        decisionOrder: 0,
      }));

      const allTagData = [...correctDecisionTagData, ...invisibleTagData];
      
      const hasTrimEdits = editPayload && hasMeaningfulEdits(editPayload, duration);
      const adjustedLoop = getAdjustedLoop(editDataForSave, duration);

      const videoData = {
        title,
        decisionExplanation: effectiveIsEducational ? decisionExplanation.trim() : null,
        isEducational: effectiveIsEducational,
        fileUrl,
        thumbnailUrl,
        duration,
        // Don't pass categoryId - let the backend handle it
        videoCategoryId: videoCategories[0]?.id || null,
        lawNumbers: [], // Deprecated: Laws now managed via tags
        playOn: hasDecisionTags ? playOn : false,
        noOffence: hasDecisionTags ? noOffence : false,
        tagData: allTagData, // Send structured tag data with order and type
        isActive: isActive,
        // Video editing metadata - use saved or latest edits
        trimStart: hasTrimEdits ? 0 : editDataForSave?.trimStart,
        trimEnd: hasTrimEdits ? duration : editDataForSave?.trimEnd,
        cutSegments: [],
        loopZoneStart: adjustedLoop.loopZoneStart ?? undefined,
        loopZoneEnd: adjustedLoop.loopZoneEnd ?? undefined,
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
        trimStart: videoData.trimStart,
        trimEnd: videoData.trimEnd,
        cutSegments: videoData.cutSegments,
        loopZoneStart: videoData.loopZoneStart,
        loopZoneEnd: videoData.loopZoneEnd,
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

      await modal.showSuccess(editingVideo ? 'Video updated successfully!' : 'Video uploaded successfully!');
      
      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoPreview('');
      setThumbnailPreview('');
      setTitle('');
      setDecisionExplanation('');
      setCorrectDecisionTags([]);
      setInvisibleTags([]);
      setUploadMode('decisions');
      setUploadProgress(0);
      setVideoEditData(null);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Failed to upload video. Please check console for details.';
      await modal.showError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Upload Mode Tabs */}
      <div className="flex items-center gap-2 rounded-xl border border-dark-600 bg-dark-800/60 p-2">
        {(['decisions', 'explanations'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setUploadMode(mode)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all",
              uploadMode === mode
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 shadow-lg shadow-cyan-500/20"
                : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
            )}
          >
            {mode === 'decisions' ? 'Decisions' : 'Explanations'}
          </button>
        ))}
      </div>

      {/* Video Upload Section */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {uploadMode === 'decisions' ? 'Upload Decision Clip' : 'Upload Explanation Clip'}
        </h3>
        
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
            {/* Video Editor - Replaces basic video preview entirely */}
            {videoDuration > 0 ? (
              <>
                <VideoEditor
                  key={videoPreview}
                  videoUrl={videoPreview}
                  duration={videoDuration}
                  onEditChange={setVideoEditData}
                  initialEdit={initialEdit}
                />

                {/* Thumbnail and Remove buttons below editor */}
                <div className="flex items-center gap-3 pt-4 border-t border-dark-600">
                  <button
                    type="button"
                    onClick={captureThumbnail}
                    className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20 transition-colors text-sm font-medium"
                  >
                    📸 Capture Thumbnail
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview('');
                      setThumbnailPreview('');
                      setThumbnailFile(null);
                      setVideoEditData(null);
                      setVideoDuration(0);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    🗑️ Remove Video
                  </button>

                  {thumbnailPreview && (
                    <div className="flex items-center gap-2 ml-auto">
                      <img src={thumbnailPreview} alt="Thumbnail" className="w-24 h-16 rounded object-cover border-2 border-cyan-500/50 shadow-lg" />
                      <span className="text-xs text-cyan-400 font-medium">Custom thumbnail</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm">
                  {editingVideo ? 'Loading video metadata...' : 'Loading video...'}
                </p>
                {editingVideo && (
                  <p className="text-xs text-text-muted mt-2">
                    Video URL: {editingVideo.fileUrl?.substring(0, 50)}...
                  </p>
                )}
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
              Video Status
            </label>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-dark-900 border border-dark-600">
              <span className={cn(
                "text-sm font-medium transition-colors",
                isActive ? "text-green-500" : "text-text-muted"
              )}>
                Active
              </span>
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-dark-900"
                style={{ backgroundColor: isActive ? '#10b981' : '#ef4444' }}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
                    isActive ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
              <span className={cn(
                "text-sm font-medium transition-colors",
                !isActive ? "text-red-500" : "text-text-muted"
              )}>
                Inactive
              </span>
              <span className="text-xs text-text-muted ml-auto">
                Inactive videos are hidden from users
              </span>
            </div>
          </div>

          {uploadMode === 'explanations' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={decisionExplanation}
                onChange={(e) => setDecisionExplanation(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Explain the decision or guidance for this clip..."
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* Tagging Section */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Tagging</h3>
        
        <div className="space-y-6">
          {/* Dynamic Tag Group Dropdowns (including Laws) */}
          {sortedTagCategories.map(category => {
            let filteredOptions = tagGroups[category.id] || [];
            
            // For CRITERIA tags, filter based on selected CATEGORY tags
            if (category.slug === CRITERIA_TAG_CATEGORY_SLUG) {
              const selectedCategoryNames = [...correctDecisionTags, ...invisibleTags]
                .filter(t => t.category?.slug === CATEGORY_TAG_CATEGORY_SLUG)
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
                key={category.id}
                label={category.name}
                color={GROUP_COLORS[category.slug] || '#00E8F8'}
                options={filteredOptions}
                selected={[...correctDecisionTags, ...invisibleTags].filter(t => t.category?.id === category.id)}
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

          {uploadMode === 'decisions' && (
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
          )}

          {/* Invisible Tags Section */}
          <div className="rounded-xl bg-dark-900/50 border border-dark-600 p-6">
            <h4 className="text-md font-semibold text-text-secondary mb-3">Filter Tags (Invisible)</h4>
            <p className="text-sm text-text-muted mb-4">
              These tags help filter videos but won't be shown as correct answers.
            </p>
            
          <InvisibleTagsList
            tags={invisibleTags}
            showMoveToCorrect={uploadMode === 'decisions'}
            showFilterOnlyLabel={uploadMode === 'decisions'}
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
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
        >
          {editingVideo ? 'Update Video' : 'Upload Video'}
        </button>
      </div>

      {/* Animated Upload Progress Overlay */}
      {loading && (
        <div 
          ref={progressOverlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          <div className="bg-gradient-to-br from-dark-900 to-dark-800 border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {/* Title */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                {uploadProgress < 90 ? 'Uploading Video' : uploadProgress < 95 ? 'Processing' : 'Finalizing'}
              </h3>
              <p className="text-gray-400 text-sm">
                {uploadProgress < 90 
                  ? 'Transferring your video to the cloud...' 
                  : uploadProgress < 95 
                    ? 'Optimizing and preparing...' 
                    : 'Saving video details...'}
              </p>
            </div>

            {/* Circular Progress */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-dark-700"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="text-cyan-500 transition-all duration-300"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 70}`,
                    strokeDashoffset: `${2 * Math.PI * 70 * (1 - uploadProgress / 100)}`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">{Math.round(uploadProgress)}%</div>
                  {videoFile && (
                    <div className="text-xs text-gray-400 mt-1">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Stages */}
            <div className="space-y-2">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                uploadProgress > 0 ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-dark-700/50 border border-dark-600"
              )}>
                {uploadProgress >= 90 ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : uploadProgress > 0 ? (
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-dark-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  uploadProgress > 0 ? "text-white" : "text-gray-500"
                )}>
                  Upload to cloud
                </span>
              </div>

              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                uploadProgress >= 90 ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-dark-700/50 border border-dark-600"
              )}>
                {uploadProgress >= 95 ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : uploadProgress >= 90 ? (
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-dark-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  uploadProgress >= 90 ? "text-white" : "text-gray-500"
                )}>
                  Process & optimize
                </span>
              </div>

              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                uploadProgress >= 95 ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-dark-700/50 border border-dark-600"
              )}>
                {uploadProgress >= 100 ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : uploadProgress >= 95 ? (
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-dark-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  uploadProgress >= 95 ? "text-white" : "text-gray-500"
                )}>
                  Save details
                </span>
              </div>
            </div>

            {/* File info */}
            {videoFile && (
              <div className="mt-6 pt-4 border-t border-dark-600">
                <p className="text-xs text-gray-400 text-center truncate">{videoFile.name}</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Hidden canvas for thumbnail capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden video element for thumbnail capture if needed */}
      {videoPreview && (
        <video ref={thumbnailVideoRef} src={videoPreview} crossOrigin="anonymous" className="hidden" />
      )}
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

  const invisibleTags = allTags.filter(t =>
    !tags.find(ct => ct.id === t.id) && t.category?.canBeCorrectAnswer
  );

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
  showMoveToCorrect = true,
  showFilterOnlyLabel = true,
  onRemove,
  onMoveToCorrect
}: { 
  tags: Tag[]; 
  showMoveToCorrect?: boolean;
  showFilterOnlyLabel?: boolean;
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
            {showMoveToCorrect && tag.category?.canBeCorrectAnswer ? (
              <button
                type="button"
                onClick={() => onMoveToCorrect(tag)}
                className="text-cyan-500 hover:text-cyan-400 transition-colors text-xs font-medium"
              >
                Move to Correct
              </button>
            ) : showFilterOnlyLabel ? (
              <span className="text-xs text-text-muted">Filter only</span>
            ) : null}
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
