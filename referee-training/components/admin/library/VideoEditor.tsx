"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VideoEditorProps {
  videoUrl: string;
  duration: number;
  onEditChange: (editData: VideoEditData) => void;
  initialEdit?: VideoEditData;
}

export interface VideoEditData {
  trimStart: number;
  trimEnd: number;
  loopZoneStart?: number;
  loopZoneEnd?: number;
}

interface EditHistoryItem {
  trimStart: number;
  trimEnd: number;
  loopZone: { start: number; end: number } | null;
}

export function VideoEditor({ videoUrl, duration: durationProp, onEditChange, initialEdit }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState<{
    type: "trim-start" | "trim-end" | "loop-start" | "loop-end" | "playhead";
    id?: string;
  } | null>(null);
  const isDraggingRef = useRef(false); // Track dragging state for handleTimeUpdate
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailsDisabled, setThumbnailsDisabled] = useState(false);

  // Actual video duration from the loaded video element (authoritative source)
  // Initialize to 0 - will be set when video actually loads
  const [actualVideoDuration, setActualVideoDuration] = useState<number>(0);
  
  // Use actual video duration as the timeline reference
  // This is the REAL duration of the video file, which may differ from the prop
  // (especially when editing a previously trimmed video)
  // Only use durationProp as fallback if video hasn't loaded yet
  const duration = actualVideoDuration > 0 ? actualVideoDuration : durationProp;

  // Edit state - will be clamped to actual duration once video loads
  const [trimStart, setTrimStart] = useState(initialEdit?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(initialEdit?.trimEnd || durationProp);
  const [loopZone, setLoopZone] = useState<{ start: number; end: number } | null>(
    initialEdit?.loopZoneStart !== undefined && initialEdit?.loopZoneEnd !== undefined
      ? { start: initialEdit.loopZoneStart, end: initialEdit.loopZoneEnd }
      : null
  );
  
  // Track if we've initialized from the actual video duration
  const hasInitializedFromVideo = useRef(false);
  const lastVideoUrl = useRef(videoUrl);
  
  // Reset when video URL changes (new video loaded)
  useEffect(() => {
    if (lastVideoUrl.current !== videoUrl) {
      console.log('VideoEditor: Video URL changed, resetting state');
      lastVideoUrl.current = videoUrl;
      hasInitializedFromVideo.current = false;
      setActualVideoDuration(0); // Will be set when video loads
      setCurrentTime(0);
    }
  }, [videoUrl]);

  // Tool state
  const frameStep = 1 / 30;

  // History for undo/redo
  const [history, setHistory] = useState<EditHistoryItem[]>([
    { trimStart, trimEnd, loopZone: null }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize values when actual video duration is known
  useEffect(() => {
    if (actualVideoDuration > 0 && !hasInitializedFromVideo.current) {
      hasInitializedFromVideo.current = true;
      
      console.log('VideoEditor: Initializing with actual video duration:', actualVideoDuration, 'vs prop:', durationProp);
      
      // The timeline represents the CURRENT video file's duration
      // For already-trimmed videos, this is the trimmed duration
      // Trim handles span 0 to actualVideoDuration (user can further trim if desired)
      setTrimStart(0);
      setTrimEnd(actualVideoDuration);
      
      // Clamp loop zone to actual video duration
      if (initialEdit?.loopZoneStart !== undefined && initialEdit?.loopZoneEnd !== undefined) {
        const clampedLoopStart = Math.max(0, Math.min(initialEdit.loopZoneStart, actualVideoDuration));
        const clampedLoopEnd = Math.max(0, Math.min(initialEdit.loopZoneEnd, actualVideoDuration));
        
        // Only set loop if it's still valid after clamping
        if (clampedLoopEnd - clampedLoopStart >= 0.1 && clampedLoopEnd <= actualVideoDuration) {
          console.log('VideoEditor: Setting clamped loop zone:', { clampedLoopStart, clampedLoopEnd });
          setLoopZone({ start: clampedLoopStart, end: clampedLoopEnd });
        } else {
          console.log('VideoEditor: Loop zone invalid after clamping, clearing');
          setLoopZone(null);
        }
      } else {
        setLoopZone(null);
      }
      
      // Reset history with correct values
      setHistory([{ trimStart: 0, trimEnd: actualVideoDuration, loopZone: null }]);
      setHistoryIndex(0);
      
      // Generate thumbnails for timeline (async, won't block)
      generateThumbnails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualVideoDuration, durationProp, initialEdit]);

  // Generate thumbnails from video
  const generateThumbnails = useCallback(async () => {
    if (thumbnailsDisabled) return;
    if (!videoRef.current || !thumbnailCanvasRef.current || actualVideoDuration <= 0) return;
    
    const video = videoRef.current;
    const canvas = thumbnailCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for thumbnails (small size for performance)
    canvas.width = 160;
    canvas.height = 90;

    const thumbCount = 20; // Number of thumbnails
    const newThumbnails: string[] = [];
    const originalTime = video.currentTime;

    try {
      for (let i = 0; i < thumbCount; i++) {
      const time = (actualVideoDuration / thumbCount) * i;
      
      // Seek to time and wait for frame
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });

        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        newThumbnails.push(dataUrl);
      }
    } catch (error) {
      console.warn('VideoEditor: Thumbnails disabled due to canvas security error.', error);
      setThumbnails([]);
      setThumbnailsDisabled(true);
      // Restore original time before returning
      video.currentTime = originalTime;
      return;
    }

    // Restore original time
    video.currentTime = originalTime;
    
    setThumbnails(newThumbnails);
    console.log('VideoEditor: Generated', newThumbnails.length, 'thumbnails');
  }, [actualVideoDuration, thumbnailsDisabled]);

  // Auto-adjust loop zone when trim boundaries change
  // This ensures the loop stays within the trim region
  useEffect(() => {
    if (!loopZone) return;
    
    let needsAdjustment = false;
    let newStart = loopZone.start;
    let newEnd = loopZone.end;
    
    // Check if loop is entirely outside trim region
    if (loopZone.start >= trimEnd || loopZone.end <= trimStart) {
      // Loop is completely outside trim region, clear it
      console.log('VideoEditor: Loop outside trim region, clearing');
      setLoopZone(null);
      return;
    }
    
    // Clamp loop start to trim boundaries
    if (loopZone.start < trimStart) {
      newStart = trimStart;
      needsAdjustment = true;
    }
    if (loopZone.start > trimEnd - 0.5) {
      newStart = Math.max(trimStart, trimEnd - 0.5);
      needsAdjustment = true;
    }
    
    // Clamp loop end to trim boundaries
    if (loopZone.end > trimEnd) {
      newEnd = trimEnd;
      needsAdjustment = true;
    }
    if (loopZone.end < trimStart + 0.5) {
      newEnd = Math.min(trimEnd, trimStart + 0.5);
      needsAdjustment = true;
    }
    
    // Ensure minimum loop length
    if (newEnd - newStart < 0.5) {
      // Try to expand the loop if possible
      if (newStart > trimStart) {
        newStart = Math.max(trimStart, newEnd - 0.5);
      } else if (newEnd < trimEnd) {
        newEnd = Math.min(trimEnd, newStart + 0.5);
      }
      
      // If still too short, clear the loop
      if (newEnd - newStart < 0.1) {
        console.log('VideoEditor: Loop too short after adjustment, clearing');
        setLoopZone(null);
        return;
      }
      needsAdjustment = true;
    }
    
    if (needsAdjustment) {
      console.log('VideoEditor: Auto-adjusting loop to fit trim region:', { 
        original: loopZone, 
        adjusted: { start: newStart, end: newEnd },
        trimBounds: { trimStart, trimEnd }
      });
      setLoopZone({ start: newStart, end: newEnd });
    }
  }, [trimStart, trimEnd]); // Only react to trim changes, not loop changes

  // Update parent when edit data changes
  useEffect(() => {
    const editData = {
      trimStart,
      trimEnd,
      cutSegments: [],
      loopZoneStart: loopZone?.start,
      loopZoneEnd: loopZone?.end,
    };
    console.log('VideoEditor: Sending edit data to parent:', editData);
    onEditChange(editData);
  }, [trimStart, trimEnd, loopZone, onEditChange]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const newState = {
      trimStart,
      trimEnd,
      loopZone: loopZone ? { ...loopZone } : null,
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [trimStart, trimEnd, loopZone, history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTrimStart(prevState.trimStart);
      setTrimEnd(prevState.trimEnd);
      setLoopZone(prevState.loopZone);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTrimStart(nextState.trimStart);
      setTrimEnd(nextState.trimEnd);
      setLoopZone(nextState.loopZone);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Calculate effective duration
  const effectiveDuration = Math.max(0, trimEnd - trimStart);

  // Safe play function
  const safePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Play error:', error);
          }
          setIsPlaying(false);
        });
    }
  }, []);

  // Video time update with real-time editing
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || isDraggingRef.current) return; // Skip all logic when dragging
    
    let time = videoRef.current.currentTime;

    // Enforce trim boundaries (only when playing, not when dragging)
    if (time < trimStart) {
      time = trimStart;
      videoRef.current.currentTime = time;
    } else if (time > trimEnd) {
      videoRef.current.currentTime = trimStart;
      videoRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Handle loop zone only during playback
    if (loopZone && isPlaying && time >= loopZone.end) {
      videoRef.current.currentTime = loopZone.start;
    }

    setCurrentTime(time);
  }, [trimStart, trimEnd, loopZone, isPlaying]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      safePlay();
    }
  }, [isPlaying, currentTime, trimStart, trimEnd, safePlay]);

  // Seek to time and update video frame
  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    
    const targetTime = Math.max(trimStart, Math.min(trimEnd, time));
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, [trimStart, trimEnd]);

  // Timeline conversion
  const timeToPosition = useCallback((time: number) => (time / duration) * 100, [duration]);
  const positionToTime = useCallback((position: number) => (position / 100) * duration, [duration]);

  // Create loop at current playhead position
  const createLoopAtPlayhead = useCallback(() => {
    const rawTime = videoRef.current?.currentTime ?? currentTime;
    const minLoopLength = 0.5;
    const desiredLoopLength = 2;
    const available = Math.max(0, trimEnd - trimStart);
    const loopLength = available >= desiredLoopLength
      ? desiredLoopLength
      : Math.max(minLoopLength, available);
    const maxStart = Math.max(trimStart, trimEnd - loopLength);
    const start = Math.max(trimStart, Math.min(maxStart, rawTime));
    const end = Math.min(trimEnd, start + loopLength);
    setLoopZone({ start, end });
    saveToHistory();
  }, [currentTime, trimStart, trimEnd, saveToHistory]);

  // Timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const time = positionToTime(percentage);

    seekTo(time);
  }, [isDragging, positionToTime, seekTo]);

  // Dragging handlers with live frame preview
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: any) => {
    e.stopPropagation();
    setIsDragging(handle);
    isDraggingRef.current = true; // Set ref immediately
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current || !videoRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = positionToTime(percentage);

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      if (!videoRef.current) return;

      switch (isDragging.type) {
        case "trim-start":
          const newTrimStart = Math.max(0, Math.min(time, trimEnd - 0.5));
          setTrimStart(newTrimStart);
          // Live frame preview
          videoRef.current.currentTime = newTrimStart;
          setCurrentTime(newTrimStart);
          break;
        case "trim-end":
          const newTrimEnd = Math.max(trimStart + 0.5, Math.min(time, duration));
          setTrimEnd(newTrimEnd);
          // Live frame preview
          videoRef.current.currentTime = newTrimEnd;
          setCurrentTime(newTrimEnd);
          break;
        case "loop-start":
          if (loopZone) {
            const newLoopStart = Math.max(trimStart, Math.min(time, loopZone.end - 0.5));
            setLoopZone({ ...loopZone, start: newLoopStart });
            // Live frame preview
            videoRef.current.currentTime = newLoopStart;
            setCurrentTime(newLoopStart);
          }
          break;
        case "loop-end":
          if (loopZone) {
            const newLoopEnd = Math.max(loopZone.start + 0.5, Math.min(time, trimEnd));
            setLoopZone({ ...loopZone, end: newLoopEnd });
            // Live frame preview
            videoRef.current.currentTime = newLoopEnd;
            setCurrentTime(newLoopEnd);
          }
          break;
        case "playhead":
          // Direct frame-by-frame scrubbing
          const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
          videoRef.current.currentTime = clampedTime;
          setCurrentTime(clampedTime);
          break;
      }
    });
  }, [isDragging, trimStart, trimEnd, duration, loopZone, positionToTime]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) saveToHistory();
    setIsDragging(null);
    isDraggingRef.current = false; // Clear ref
  }, [isDragging, saveToHistory]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, togglePlay]);

  // Format time
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Main Video Preview - Clean, no overlays */}
      <div className="flex-1 flex items-center justify-center bg-black p-4 min-h-[500px]">
        <div className="relative w-full max-w-5xl aspect-video">
          <video
            ref={videoRef}
            src={videoUrl}
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const videoDuration = videoRef.current.duration;
                console.log('VideoEditor: Video loaded, actual duration:', videoDuration);
                
                // Set the actual video duration - this is the authoritative source
                if (Number.isFinite(videoDuration) && videoDuration > 0) {
                  setActualVideoDuration(videoDuration);
                }
                
                // Seek to start of trim region
                videoRef.current.currentTime = Math.min(trimStart, videoDuration);
              }
            }}
          />
        </div>
      </div>

      {/* Timeline Panel - Premiere-style */}
      <div className="bg-[#2a2a2a] border-t border-[#3a3a3a] p-4 space-y-2">
        {/* Transport Controls with Timecode Display */}
        <div className="flex items-center gap-4 px-2">
          {/* Timecode Display - Premiere style */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 border border-[#3a3a3a]">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Current</span>
            <span className="text-sm font-mono text-cyan-400 min-w-[72px]">{formatTime(currentTime)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => seekTo(trimStart)}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
              title="Go to trim start"
            >
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => seekTo(currentTime - frameStep)}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
              title="Previous frame"
            >
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6v12z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="p-3 bg-[#0d7abf] hover:bg-[#0b6aa8] rounded transition-colors"
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => seekTo(currentTime + frameStep)}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
              title="Next frame"
            >
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6V6z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => seekTo(trimEnd)}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
              title="Go to trim end"
            >
              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z" />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-[#3a3a3a]" />

          {/* Loop Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={createLoopAtPlayhead}
              className="px-3 py-2 rounded text-xs font-medium text-gray-300 hover:bg-[#3a3a3a] transition-colors"
              title="Create 2s loop at playhead"
            >
              Set Loop
            </button>
            {loopZone && (
              <button
                type="button"
                onClick={() => {
                  setLoopZone(null);
                  saveToHistory();
                }}
                className="px-3 py-2 rounded text-xs font-medium text-red-400 hover:bg-[#3a3a3a] transition-colors"
              >
                Clear Loop
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-[#3a3a3a]" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2 hover:bg-[#3a3a3a] rounded transition-colors disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Duration Info - Right side */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 border border-[#3a3a3a]">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</span>
              <span className="text-sm font-mono text-gray-300 min-w-[72px]">{formatTime(duration)}</span>
            </div>
            {effectiveDuration !== duration && (
              <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-3 py-1.5 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-500 uppercase tracking-wider">Trimmed</span>
                <span className="text-sm font-mono text-cyan-400 min-w-[72px]">{formatTime(effectiveDuration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Time Ruler */}
        <div className="relative h-5 mx-1">
          {/* Time markers */}
          <div className="absolute inset-0 flex justify-between items-end px-1">
            <span className="text-[10px] text-gray-500 font-mono">0:00</span>
            <span className="text-[10px] text-gray-500 font-mono">{formatTime(duration / 4).slice(0, 5)}</span>
            <span className="text-[10px] text-gray-500 font-mono">{formatTime(duration / 2).slice(0, 5)}</span>
            <span className="text-[10px] text-gray-500 font-mono">{formatTime(duration * 3 / 4).slice(0, 5)}</span>
            <span className="text-[10px] text-gray-500 font-mono">{formatTime(duration).slice(0, 5)}</span>
          </div>
          {/* Playhead time indicator - positioned above playhead */}
          <div 
            className="absolute -top-1 transform -translate-x-1/2 z-20 pointer-events-none"
            style={{ left: `${timeToPosition(currentTime)}%` }}
          >
            <div className="bg-white text-[#1a1a1a] text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Timeline Track */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-20 bg-[#1a1a1a] rounded cursor-crosshair border border-[#3a3a3a] overflow-hidden"
        >
          {/* Video frame thumbnails */}
          {thumbnails.length > 0 && (
            <div className="absolute inset-0 flex">
              {thumbnails.map((thumb, index) => (
                <div
                  key={index}
                  className="flex-1 h-full border-r border-[#2a2a2a]"
                  style={{
                    backgroundImage: `url(${thumb})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ))}
            </div>
          )}

          {/* Dimmed overlay for trimmed regions */}
          {/* Left trimmed region */}
          {trimStart > 0 && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/70 pointer-events-none"
              style={{
                width: `${timeToPosition(trimStart)}%`,
              }}
            />
          )}
          {/* Right trimmed region */}
          {trimEnd < duration && (
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/70 pointer-events-none"
              style={{
                width: `${100 - timeToPosition(trimEnd)}%`,
              }}
            />
          )}

          {/* Active region highlight */}
          <div
            className="absolute top-0 bottom-0 border-y-2 border-[#0d7abf] pointer-events-none"
            style={{
              left: `${timeToPosition(trimStart)}%`,
              width: `${timeToPosition(trimEnd - trimStart)}%`,
            }}
          />

          {/* Loop zone - GREEN like user UI */}
          {loopZone && (
            <div
              className="absolute top-0 bottom-0 bg-green-500/20 border-y border-green-500"
              style={{
                left: `${timeToPosition(loopZone.start)}%`,
                width: `${timeToPosition(loopZone.end - loopZone.start)}%`,
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize hover:w-3"
                onMouseDown={(e) => handleMouseDown(e, { type: "loop-start" })}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize hover:w-3"
                onMouseDown={(e) => handleMouseDown(e, { type: "loop-end" })}
              />
            </div>
          )}

          {/* Trim handles */}
          <div
            className="absolute top-0 bottom-0 w-3 bg-[#0d7abf] cursor-ew-resize hover:w-4"
            style={{ left: `${timeToPosition(trimStart)}%` }}
            onMouseDown={(e) => handleMouseDown(e, { type: "trim-start" })}
          />
          <div
            className="absolute top-0 bottom-0 w-3 bg-[#0d7abf] cursor-ew-resize hover:w-4"
            style={{ left: `calc(${timeToPosition(trimEnd)}% - 12px)` }}
            onMouseDown={(e) => handleMouseDown(e, { type: "trim-end" })}
          />

          {/* Playhead - Simple line, no arrow */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-10 shadow-lg"
            style={{ left: `${timeToPosition(currentTime)}%` }}
            onMouseDown={(e) => handleMouseDown(e, { type: "playhead" })}
          />
        </div>

        {/* Info bar - Loop info only */}
        {loopZone && (
          <div className="flex items-center gap-4 text-xs px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-400">Loop:</span>
              <span className="font-mono text-green-400">{formatTime(loopZone.start)}</span>
              <span className="text-gray-500">→</span>
              <span className="font-mono text-green-400">{formatTime(loopZone.end)}</span>
              <span className="text-gray-500">({formatTime(loopZone.end - loopZone.start).slice(0, 5)})</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={thumbnailCanvasRef} className="hidden" />
    </div>
  );
}
