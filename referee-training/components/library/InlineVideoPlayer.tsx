"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DecisionReveal } from "./DecisionReveal";
import { useLawTags } from "@/components/hooks/useLawTags";

interface LoopMarker {
  time: number;
  type: 'A' | 'B';
}

interface Video {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  description?: string;
  playOn?: boolean;
  noOffence?: boolean;
  correctDecision?: string;
  restartType?: string;
  sanctionType?: string;
  decisionExplanation?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  isEducational?: boolean;
  varNotes?: string;
  offsideReason?: string;
  lawNumbers?: number[];
  tags?: Array<{
    id: string;
    slug: string;
    name: string;
    category:
      | {
          id: string;
          name: string;
          slug: string;
          canBeCorrectAnswer: boolean;
        }
      | null;
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
}

interface InlineVideoPlayerProps {
  video: Video;
  isExpanded: boolean;
  isLoadingDetails?: boolean;
  isSharedLayoutEnabled?: boolean;
  suppressPoster?: boolean;
  isAnswerOpen?: boolean;
  onClose: () => void;
  onDecisionReveal?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  className?: string;
  showDecision?: boolean;
  onCloseDecision?: () => void;
}

/**
 * InlineVideoPlayer - Professional video player for referee training
 * 
 * Features:
 * - Custom controls with smooth scrubbing (click & drag timeline)
 * - Frame-by-frame navigation (perfect for decision analysis)
 * - Draggable A-B loop markers with visual indicators (always visible)
 * - Variable playback speed (0.25x - 1x)
 * - Volume control with mute
 * - Comprehensive keyboard shortcuts
 * - Beautiful animations and transitions
 * - Next/Prev video navigation
 * - Show Answer integration
 * 
 * Keyboard Shortcuts:
 * - Space: Play/Pause
 * - R: Replay video from start
 * - , (comma): Previous frame
 * - . (period): Next frame
 * - Shift + ←/→: Jump 5 seconds
 * - J: Rewind / K: Pause / L: Forward (pro editor style)
 * - A: Set loop start marker (drag on timeline to adjust)
 * - B: Set loop end marker (drag on timeline to adjust)
 * - Shift + L: Toggle loop on/off
 * - C: Reset loop markers
 * - [ : Decrease playback speed
 * - ] : Increase playback speed
 * - 1: Reset speed to 1x
 * - M: Mute/Unmute
 * - I: Show answer
 * - ? or /: Show keyboard shortcuts
 * - Esc: Close video
 */
export function InlineVideoPlayer({
  video,
  isExpanded,
  isLoadingDetails = false,
  isSharedLayoutEnabled = true,
  suppressPoster = false,
  isAnswerOpen = false,
  onClose,
  onDecisionReveal,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  className,
  showDecision = false,
  onCloseDecision,
}: InlineVideoPlayerProps) {
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);
  const [loopMarkerA, setLoopMarkerA] = useState<number>(0);
  const [loopMarkerB, setLoopMarkerB] = useState<number>(0);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState<'A' | 'B' | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const { lawTagMap, getLawLabel } = useLawTags();

  const safePlay = useCallback(() => {
    if (!videoRef.current) return;
    const playPromise = videoRef.current.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Play failed:", err);
        setIsPlaying(false);
      });
    }
  }, []);

  // Determine if we should show the "Show Answer" button
  // Show if ANY tags are marked with isCorrectDecision: true or explanation-only has text
  const hasCorrectDecisionTags = video.tags?.some(tag => tag.isCorrectDecision) || false;
  const hasExplanation = Boolean(video.decisionExplanation && video.decisionExplanation.trim().length > 0);
  const hasAnswer = Boolean(onDecisionReveal && (hasCorrectDecisionTags || (video.isEducational && hasExplanation)));

  // Assume 30fps for frame-by-frame navigation
  const FRAME_RATE = 30;
  const FRAME_DURATION = 1 / FRAME_RATE;

  // Format time helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get position percentage for markers
  const getMarkerPosition = (time: number) => {
    if (duration === 0) return time === 0 ? 0 : 100;
    return (time / duration) * 100;
  };

  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setLoopMarkerA(0);
    setLoopMarkerB(0);
    setIsLoopEnabled(false);
    setIsFullscreen(false);
    onClose();
  }, [onClose]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!playerWrapperRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await playerWrapperRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  // Listen for fullscreen changes (user can exit with ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Frame stepping
  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;
    const newTime = direction === 'forward' 
      ? currentTime + FRAME_DURATION 
      : currentTime - FRAME_DURATION;
    const clampedTime = Math.max(0, Math.min(newTime, duration));
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    videoRef.current.pause();
    setIsPlaying(false);
  }, [currentTime, duration, FRAME_DURATION]);

  // Scrubbing handlers
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleScrubStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    setWasPlayingBeforeScrub(!videoRef.current?.paused);
    videoRef.current?.pause();
    setIsPlaying(false);
    handleProgressClick(e);
  }, [handleProgressClick]);

  const handleScrubMove = useCallback((e: MouseEvent) => {
    if (!isScrubbing || !progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [isScrubbing, duration]);

  const handleScrubEnd = useCallback(() => {
    setIsScrubbing(false);
    if (wasPlayingBeforeScrub) {
      safePlay();
      setIsPlaying(true);
    }
  }, [wasPlayingBeforeScrub, safePlay]);

  // Marker dragging handlers
  const handleMarkerDragStart = useCallback((e: React.MouseEvent, marker: 'A' | 'B') => {
    e.stopPropagation();
    setDraggingMarker(marker);
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleMarkerDragMove = useCallback((e: MouseEvent) => {
    if (!draggingMarker || !progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    
    if (draggingMarker === 'A') {
      setLoopMarkerA(newTime);
    } else {
      setLoopMarkerB(newTime);
    }
  }, [draggingMarker, duration]);

  const handleMarkerDragEnd = useCallback(() => {
    setDraggingMarker(null);
  }, []);

  // Reset state when video changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsScrubbing(false);
    setDraggingMarker(null);
    setIsLoopEnabled(false);
    setLoopMarkerA(0);
    setLoopMarkerB(0);
    setPlaybackRate(1);
    setIsVideoReady(false);
    setHasStartedPlayback(false);
    
    // Reset video element time and playback rate
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 1;
    }
  }, [video.id]);

  // Set loop marker B to duration when duration loads
  useEffect(() => {
    if (duration > 0 && loopMarkerB === 0) {
      setLoopMarkerB(duration);
    }
  }, [duration, loopMarkerB]);

  // Update video playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Update video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Update video muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Update currentTime and duration from video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
    };
  }, [video.id]);

  // A-B Loop functionality
  useEffect(() => {
    if (!isLoopEnabled || !videoRef.current) return;
    
    const startTime = Math.min(loopMarkerA, loopMarkerB);
    const endTime = Math.max(loopMarkerA, loopMarkerB);

    if (currentTime >= endTime) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  }, [currentTime, isLoopEnabled, loopMarkerA, loopMarkerB]);

  // Auto-play when expanded + Disable body scroll
  useEffect(() => {
    if (isExpanded && videoRef.current) {
      safePlay();
      setIsPlaying(true);
      // Disable body scroll - use both overflow hidden and position fixed
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else if (!isExpanded && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      // Re-enable body scroll and restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isExpanded, video.id, safePlay]);

  // Global mouse event handlers for scrubbing
  useEffect(() => {
    if (isScrubbing) {
      window.addEventListener('mousemove', handleScrubMove);
      window.addEventListener('mouseup', handleScrubEnd);
      return () => {
        window.removeEventListener('mousemove', handleScrubMove);
        window.removeEventListener('mouseup', handleScrubEnd);
      };
    }
  }, [isScrubbing, handleScrubMove, handleScrubEnd]);

  // Global mouse event handlers for marker dragging
  useEffect(() => {
    if (draggingMarker) {
      window.addEventListener('mousemove', handleMarkerDragMove);
      window.addEventListener('mouseup', handleMarkerDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleMarkerDragMove);
        window.removeEventListener('mouseup', handleMarkerDragEnd);
      };
    }
  }, [draggingMarker, handleMarkerDragMove, handleMarkerDragEnd]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) return;

      // Close video with Escape (if not in fullscreen)
      if (e.key === "Escape") {
        if (!isAnswerOpen && !document.fullscreenElement) {
          handleClose();
        }
        return;
      }

      // Toggle fullscreen with 'f' or 'F'
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Spacebar toggles play/pause
      if (e.key === " ") {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            safePlay();
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
        return;
      }

      // Frame stepping with comma/period
      if (e.key === ",") {
        e.preventDefault();
        stepFrame('backward');
        return;
      }
      if (e.key === ".") {
        e.preventDefault();
        stepFrame('forward');
        return;
      }

      // Alternative frame stepping with Cmd/Ctrl + Arrow keys
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        stepFrame('backward');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
        e.preventDefault();
        stepFrame('forward');
        return;
      }

      // Time jumps with Shift + Arrow (5 seconds)
      if (e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.max(0, currentTime - 5);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        return;
      }
      if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.min(duration, currentTime + 5);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        return;
      }

      // Pro video editor shortcuts: J/K/L
      if (e.key === "k") {
        e.preventDefault();
        if (videoRef.current?.paused) {
          safePlay();
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
        return;
      }
      if (e.key === "j") {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.max(0, currentTime - 0.5);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        return;
      }
      if (e.key === "l") {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.min(duration, currentTime + 0.5);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        return;
      }

      // Set loop marker A with 'a' key
      if (e.key === "a") {
        e.preventDefault();
        setLoopMarkerA(currentTime);
        return;
      }

      // Set loop marker B with 'b' key
      if (e.key === "b") {
        e.preventDefault();
        setLoopMarkerB(currentTime);
        return;
      }

      // Toggle loop with 'Shift + L'
      if (e.shiftKey && e.key === "L") {
        e.preventDefault();
        setIsLoopEnabled(!isLoopEnabled);
        return;
      }

      // Reset loop markers with 'c'
      if (e.key === "c") {
        e.preventDefault();
        setLoopMarkerA(0);
        setLoopMarkerB(duration);
        setIsLoopEnabled(false);
        return;
      }

      // Toggle mute with 'm'
      if (e.key === "m") {
        e.preventDefault();
        setIsMuted(!isMuted);
        return;
      }

      // Decrease playback speed with '[' or '<'
      if (e.key === "[" || e.key === "<") {
        e.preventDefault();
        setPlaybackRate(prev => {
          const speeds = [0.25, 0.5, 0.75, 1];
          const currentIndex = speeds.indexOf(prev);
          return currentIndex > 0 ? speeds[currentIndex - 1] : speeds[0];
        });
        return;
      }

      // Increase playback speed with ']' or '>'
      if (e.key === "]" || e.key === ">") {
        e.preventDefault();
        setPlaybackRate(prev => {
          const speeds = [0.25, 0.5, 0.75, 1];
          const currentIndex = speeds.indexOf(prev);
          return currentIndex < speeds.length - 1 ? speeds[currentIndex + 1] : speeds[speeds.length - 1];
        });
        return;
      }

      // Reset playback speed to 1x with '1'
      if (e.key === "1") {
        e.preventDefault();
        setPlaybackRate(1);
        return;
      }

      // Video navigation (non-modifier keys)
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === "ArrowRight" && hasNext) {
          onNext?.();
          return;
        }
        if (e.key === "ArrowLeft" && hasPrev) {
          onPrev?.();
          return;
        }
      }

      // Show answer with 'i' (only if keyboard help is not open)
      if ((e.key === "i" || e.key === "I") && hasAnswer && !isAnswerOpen && !showKeyboardHelp) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        onDecisionReveal?.();
        return;
      }

      // Close keyboard help if 'i' pressed while it's open
      if ((e.key === "i" || e.key === "I") && showKeyboardHelp) {
        e.preventDefault();
        setShowKeyboardHelp(false);
        return;
      }

      // Replay video from start with 'r' or 'R'
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          setCurrentTime(0);
          safePlay();
          setIsPlaying(true);
        }
        return;
      }

      // Toggle keyboard shortcuts help with '?' or '/' (only if answer is not open)
      if ((e.key === "?" || e.key === "/") && !isAnswerOpen) {
        e.preventDefault();
        setShowKeyboardHelp(!showKeyboardHelp);
        return;
      }

      // Close answer if '?' or '/' pressed while it's open
      if ((e.key === "?" || e.key === "/") && isAnswerOpen) {
        e.preventDefault();
        return;
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isExpanded, hasNext, hasPrev, onNext, onPrev, hasAnswer, isAnswerOpen, onDecisionReveal,
    handleClose, stepFrame, currentTime, duration, loopMarkerA, loopMarkerB, isLoopEnabled, safePlay, toggleFullscreen, showKeyboardHelp
  ]);

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setHasStartedPlayback(true);
  };
  const handleVideoPause = () => setIsPlaying(false);
  const handleVideoEnded = () => setIsPlaying(false);

  return (
    <AnimatePresence>
      {isExpanded && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 bg-black/80 backdrop-blur-sm",
              "transition-opacity duration-300"
            )}
            style={{ zIndex: 99998 }}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          />

          {/* Expanded Video Container */}
          <motion.div
            key="player-container"
            ref={playerWrapperRef}
            className={cn(
              "fixed inset-0 flex flex-col items-center justify-center pointer-events-none",
              // Responsive padding - less on small screens
              isFullscreen ? "p-0" : "pt-[88px] sm:pt-[100px] pb-4 sm:pb-6 px-2 sm:px-4 md:px-12",
              className
            )}
            style={{ zIndex: 99999 }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: 0.1 } }} // Keep container alive during exit
          >
            <motion.div
              key={`player-${video.id}`}
              layoutId={`video-${video.id}`}
              className={cn(
                "relative flex flex-col bg-dark-900 border border-dark-600 rounded-xl overflow-hidden shadow-2xl pointer-events-auto",
                // Responsive sizing - ensure it fits on all screens
                isFullscreen 
                  ? "w-full h-full rounded-none" 
                  : "w-full max-w-6xl max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)]"
              )}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
              transition={isSharedLayoutEnabled ? { type: "spring", stiffness: 250, damping: 25 } : { duration: 0 }}
              style={{ borderRadius: isFullscreen ? "0" : "16px", zIndex: 100000 }} // Match VideoCard3D border-radius (rounded-2xl = 16px)
            >
              {/* Close Button */}
              <button
                onClick={(e) => handleClose(e)}
                className={cn(
                  "absolute top-4 right-4 w-10 h-10",
                  "bg-black/60 hover:bg-black/80 rounded-full",
                  "flex items-center justify-center",
                  "transition-all duration-200",
                  "text-white hover:text-accent focus:outline-none",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                style={{ zIndex: 100001 }}
                aria-label="Close video"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Keyboard Shortcuts Help Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKeyboardHelp(true);
                }}
                style={{ zIndex: 100001 }}
                className={cn(
                  "absolute top-4 right-16 w-10 h-10",
                  "bg-black/60 hover:bg-black/80 rounded-full",
                  "flex items-center justify-center",
                  "transition-all duration-200",
                  "text-white/70 hover:text-white focus:outline-none text-lg font-bold",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                ?
              </button>

              {/* Navigation Buttons */}
              {hasPrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev?.();
                  }}
                  style={{ zIndex: 100001 }}
                  className={cn(
                    "absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12",
                    "bg-black/40 hover:bg-black/70 rounded-full",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "text-white/70 hover:text-accent hover:scale-110",
                    showControls ? "opacity-100" : "opacity-0"
                  )}
                  aria-label="Previous video"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {hasNext && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext?.();
                  }}
                  style={{ zIndex: 100001 }}
                  className={cn(
                    "absolute top-1/2 right-4 -translate-y-1/2 w-12 h-12",
                    "bg-black/40 hover:bg-black/70 rounded-full",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "text-white/70 hover:text-accent hover:scale-110",
                    showControls ? "opacity-100" : "opacity-0"
                  )}
                  aria-label="Next video"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Video Player */}
              <div className={cn(
                "relative bg-black w-full group/video",
                isFullscreen ? "h-full" : "aspect-video"
              )}>
                <video
                  ref={videoRef}
                  src={video.fileUrl}
                  className={cn(
                    "w-full h-full transition-opacity duration-200",
                    isFullscreen ? "object-contain" : "object-contain",
                    isVideoReady ? "opacity-100" : "opacity-0"
                  )}
                  preload="metadata"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                  onLoadedData={() => setIsVideoReady(true)}
                >
                  Your browser does not support the video tag.
                </video>

                {/* Thumbnail Overlay - Matches VideoCard3D for smooth transition */}
                {video.thumbnailUrl && !hasStartedPlayback && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-dark-900/20" /> {/* Match card overlay */}
                  </div>
                )}

                {!hasStartedPlayback && !video.thumbnailUrl && (
                  <div className="absolute inset-0 bg-black transition-opacity duration-200" />
                )}

                {/* Custom Controls Overlay */}
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent",
                  "transition-opacity duration-300 p-4",
                  showControls || isScrubbing || draggingMarker ? "opacity-100" : "opacity-0"
                )}>
                  {/* Progress Bar with Loop Markers */}
                  <div className="mb-3">
                    <div 
                      ref={progressBarRef}
                      className="relative w-full h-2 bg-white/20 rounded-full cursor-pointer group/progress"
                      onMouseDown={handleScrubStart}
                      onClick={handleProgressClick}
                    >
                      {/* Loop region highlight - only show when loop is active */}
                      {isLoopEnabled && (
                        <div
                          className="absolute top-0 h-full rounded-full transition-colors bg-green-500/30 z-[1]"
                          style={{
                            left: `${Math.min(getMarkerPosition(loopMarkerA), getMarkerPosition(loopMarkerB))}%`,
                            width: `${Math.abs(getMarkerPosition(loopMarkerB) - getMarkerPosition(loopMarkerA))}%`
                          }}
                        />
                      )}

                      {/* Played portion */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all pointer-events-none z-5"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />

                      {/* Scrubber handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all pointer-events-none z-10"
                        style={{ 
                          left: `${(currentTime / duration) * 100}%`,
                          transform: `translate(-50%, -50%) scale(${isScrubbing || showControls ? 1 : 0.8})`
                        }}
                      />

                      {/* Loop Marker A - Left bracket [ */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-20 group/marker"
                        style={{ left: `${getMarkerPosition(loopMarkerA)}%` }}
                        onMouseDown={(e) => handleMarkerDragStart(e, 'A')}
                      >
                        {/* Bracket shape [ */}
                        <div className={cn(
                          "relative w-3 h-6 transition-all",
                          "border-l-2 border-t-2 border-b-2 rounded-l-sm",
                          "group-hover/marker:scale-110",
                          isLoopEnabled 
                            ? "border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" 
                            : "border-white/30 shadow-[0_0_2px_rgba(255,255,255,0.2)] group-hover/marker:border-white/50"
                        )} />
                        {/* Hover tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded">
                            Loop Start
                          </div>
                        </div>
                      </div>

                      {/* Loop Marker B - Right bracket ] */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-20 group/marker"
                        style={{ left: `${getMarkerPosition(loopMarkerB)}%` }}
                        onMouseDown={(e) => handleMarkerDragStart(e, 'B')}
                      >
                        {/* Bracket shape ] */}
                        <div className={cn(
                          "relative w-3 h-6 transition-all",
                          "border-r-2 border-t-2 border-b-2 rounded-r-sm",
                          "group-hover/marker:scale-110",
                          isLoopEnabled 
                            ? "border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" 
                            : "border-white/30 shadow-[0_0_2px_rgba(255,255,255,0.2)] group-hover/marker:border-white/50"
                        )} />
                        {/* Hover tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded">
                            Loop End
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time display */}
                    <div className="flex justify-between items-center text-xs text-white/70 mt-1.5 px-1">
                      <span className="font-mono">{formatTime(currentTime)}</span>
                      <span className="font-mono">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control buttons row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Play/Pause button */}
                      <button
                        onClick={() => {
                          if (videoRef.current?.paused) {
                            safePlay();
                            setIsPlaying(true);
                          } else {
                            videoRef.current?.pause();
                            setIsPlaying(false);
                          }
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      {/* Frame back */}
                      <button
                        onClick={() => stepFrame('backward')}
                        className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                        title="Previous frame (,)"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Frame forward */}
                      <button
                        onClick={() => stepFrame('forward')}
                        className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                        title="Next frame (.)"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Loop controls */}
                    <div className="flex items-center gap-2">
                      {/* Loop indicator/toggle */}
                      <button
                        onClick={() => setIsLoopEnabled(!isLoopEnabled)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                          isLoopEnabled 
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/30" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                        title="Toggle loop (Shift+L)"
                      >
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>{isLoopEnabled ? "LOOP ON" : "Loop"}</span>
                        </div>
                      </button>

                      {/* Reset loop markers button */}
                      <button
                        onClick={() => {
                          setLoopMarkerA(0);
                          setLoopMarkerB(duration);
                          setIsLoopEnabled(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 rounded transition-all"
                        title="Reset loop markers (C)"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {/* Volume control */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                          title="Mute/Unmute (M)"
                        >
                          {isMuted ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          ) : volume > 0.5 ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          )}
                        </button>
                        
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const newVolume = parseFloat(e.target.value);
                            setVolume(newVolume);
                            if (newVolume > 0 && isMuted) {
                              setIsMuted(false);
                            }
                          }}
                          className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, white 0%, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                          }}
                          title="Volume"
                        />
                      </div>

                      {/* Fullscreen button */}
                      <button
                        onClick={() => toggleFullscreen()}
                        className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                        title="Fullscreen (F)"
                      >
                        {isFullscreen ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>

                      {/* Playback speed control */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const speeds = [0.25, 0.5, 0.75, 1];
                            const currentIndex = speeds.indexOf(playbackRate);
                            setPlaybackRate(currentIndex > 0 ? speeds[currentIndex - 1] : speeds[0]);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                          title="Decrease speed ([)"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => setPlaybackRate(1)}
                          className={cn(
                            "px-3 py-1 rounded text-xs font-mono font-bold transition-all min-w-[52px]",
                            playbackRate === 1
                              ? "bg-white/20 text-white"
                              : "bg-white/10 text-white/70 hover:bg-white/15"
                          )}
                          title="Playback speed ([ ] to adjust, 1 to reset)"
                        >
                          {playbackRate}x
                        </button>
                        
                        <button
                          onClick={() => {
                            const speeds = [0.25, 0.5, 0.75, 1];
                            const currentIndex = speeds.indexOf(playbackRate);
                            setPlaybackRate(currentIndex < speeds.length - 1 ? speeds[currentIndex + 1] : speeds[speeds.length - 1]);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                          title="Increase speed (])"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Info & Controls - Footer */}
              <div className={cn(
                "p-4 bg-dark-900/95 border-t border-white/10 flex items-center justify-between",
                "flex-shrink-0" // Prevent footer from being compressed
              )}>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white line-clamp-1">{video.title}</h2>
                  {video.description && (
                    <p className="text-text-secondary text-sm line-clamp-1">{video.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {video.lawNumbers && video.lawNumbers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {video.lawNumbers.map((lawNum) => {
                        const lawTag = lawTagMap.get(lawNum);
                        const label = getLawLabel(lawNum);
                        return lawTag?.linkUrl ? (
                          <a
                            key={lawNum}
                            href={lawTag.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-dark-800 border border-white/10 text-xs text-cyan-300 hover:border-cyan-400/60 hover:text-cyan-200 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={label}
                          >
                            {label}
                          </a>
                        ) : (
                          <span
                            key={lawNum}
                            className="px-2 py-1 rounded bg-dark-800 border border-white/5 text-xs text-text-muted"
                            title={label}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Show Answer Button */}
                  {hasAnswer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Pause video when showing answer
                        if (videoRef.current && !videoRef.current.paused) {
                          videoRef.current.pause();
                        }
                        onDecisionReveal?.();
                      }}
                      className={cn(
                        "px-4 py-2 bg-accent hover:bg-accent/90",
                        "text-dark-900 font-bold text-sm uppercase tracking-wider",
                        "rounded shadow-lg",
                        "transition-all duration-200 hover:scale-105 active:scale-95"
                      )}
                    >
                      {video.isEducational ? "Show Explanation" : "Show Answer"}
                    </button>
                  )}
                </div>
              </div>

              {/* Keyboard Shortcuts Help Overlay */}
              <AnimatePresence>
                {showKeyboardHelp && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="absolute inset-0 bg-black/90 transition-opacity duration-300"
                      style={{ zIndex: 100002 }}
                      onClick={() => setShowKeyboardHelp(false)}
                    />
                    
                    {/* Modal */}
                    <div className="absolute inset-0 flex items-center justify-center p-6" style={{ zIndex: 100003 }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-xl max-h-[60vh] overflow-y-auto bg-gradient-to-br from-dark-800 to-dark-900 rounded-xl p-5 border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white">Keyboard Shortcuts</h3>
                          </div>
                          <button
                            onClick={() => setShowKeyboardHelp(false)}
                            className="text-white/50 hover:text-white transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-3">
                        {/* Playback Controls - Blue */}
                        <div>
                          <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Playback</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Play / Pause</span>
                              <kbd className="px-2.5 py-1 bg-blue-500/30 border border-blue-500/50 rounded text-blue-300 font-mono text-xs font-semibold">Space</kbd>
                            </div>
                            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Replay from start</span>
                              <kbd className="px-2.5 py-1 bg-blue-500/30 border border-blue-500/50 rounded text-blue-300 font-mono text-xs font-semibold">R</kbd>
                            </div>
                          </div>
                        </div>

                        {/* Navigation - Green */}
                        <div>
                          <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1.5">Navigation</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Frame by frame</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">,</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">.</kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Rewind / Forward (0.5s)</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">J</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">L</kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Jump 5 seconds</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">Shift+←</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-green-500/30 border border-green-500/50 rounded text-green-300 font-mono text-xs font-semibold">Shift+→</kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Loop Controls - Orange */}
                        <div>
                          <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5">Loop Controls</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Set loop markers</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-orange-500/30 border border-orange-500/50 rounded text-orange-300 font-mono text-xs font-semibold">A</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-orange-500/30 border border-orange-500/50 rounded text-orange-300 font-mono text-xs font-semibold">B</kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Toggle loop / Reset</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-orange-500/30 border border-orange-500/50 rounded text-orange-300 font-mono text-xs font-semibold">Shift+L</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-orange-500/30 border border-orange-500/50 rounded text-orange-300 font-mono text-xs font-semibold">C</kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Speed & Other - Cyan */}
                        <div>
                          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1.5">Speed & Other</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Adjust speed</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">[</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">]</kbd>
                                <span className="text-white/40 text-xs mx-0.5">or</span>
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">1</kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded px-3 py-1.5">
                              <span className="text-white/80 text-sm">Mute / Fullscreen</span>
                              <div className="flex gap-1.5 items-center">
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">M</kbd>
                                <span className="text-white/30 text-xs">/</span>
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">F</kbd>
                              </div>
                            </div>
                            {hasAnswer && (
                              <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded px-3 py-1.5">
                                <span className="text-white/80 text-sm">Show answer / Close</span>
                                <div className="flex gap-1.5 items-center">
                                  <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">I</kbd>
                                  <span className="text-white/30 text-xs">/</span>
                                  <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">Esc</kbd>
                                </div>
                              </div>
                            )}
                            {!hasAnswer && (
                              <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded px-3 py-1.5">
                                <span className="text-white/80 text-sm">Close video</span>
                                <kbd className="px-2.5 py-1 bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-300 font-mono text-xs font-semibold">Esc</kbd>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                        <div className="mt-3 pt-3 border-t border-white/10 text-center">
                          <span className="text-xs text-white/50">Press </span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white/70 text-xs">?</kbd>
                          <span className="text-xs text-white/50"> or </span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white/70 text-xs">/</kbd>
                          <span className="text-xs text-white/50"> to toggle</span>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Decision Reveal - Inside fullscreen container */}
            {showDecision && (
              <DecisionReveal
                isOpen={showDecision}
                onClose={() => onCloseDecision?.()}
                playOn={video.playOn}
                noOffence={video.noOffence}
                correctDecision={video.correctDecision}
                restartType={video.restartType}
                sanctionType={video.sanctionType}
                offsideReason={video.offsideReason}
                decisionExplanation={video.decisionExplanation}
                keyPoints={video.keyPoints}
                commonMistakes={video.commonMistakes}
                varRelevant={false}
                varNotes={video.varNotes}
                isEducational={video.isEducational}
                lawNumbers={video.lawNumbers}
                tags={video.tags}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
