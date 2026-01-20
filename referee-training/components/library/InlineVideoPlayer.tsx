"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    category: string;
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
}

interface InlineVideoPlayerProps {
  video: Video;
  isExpanded: boolean;
  isAnswerOpen?: boolean;
  onClose: () => void;
  onDecisionReveal?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  className?: string;
}

/**
 * InlineVideoPlayer - Single-page video experience
 * 
 * Features:
 * - Expands in-place when clicked (shared layout animation)
 * - Auto-plays on expansion
 * - Next/Prev navigation
 * - Show Answer button
 * - Smooth animations
 */
export function InlineVideoPlayer({
  video,
  isExpanded,
  isAnswerOpen = false,
  onClose,
  onDecisionReveal,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  className,
}: InlineVideoPlayerProps) {
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if we should show the "Show Answer" button
  // Show if ANY tags are marked with isCorrectDecision: true
  const hasCorrectDecisionTags = video.tags?.some(tag => tag.isCorrectDecision) || false;
  const hasAnswer = Boolean(onDecisionReveal && hasCorrectDecisionTags);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onClose();
  }, [onClose]);

  // Auto-play when expanded
  useEffect(() => {
    if (isExpanded && videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error("Autoplay failed:", err);
      });
      setIsPlaying(true);
    } else if (!isExpanded && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isExpanded, video.id]); // Re-run when video changes

  // ESC key handler and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        // Only close video if answer is not open
        // If answer is open, DecisionReveal will handle closing itself
        if (!isAnswerOpen) {
          handleClose();
        }
      } else if (e.key === " " && isExpanded) {
        // Spacebar toggles play/pause
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.key === "ArrowRight" && hasNext && isExpanded) {
        onNext?.();
      } else if (e.key === "ArrowLeft" && hasPrev && isExpanded) {
        onPrev?.();
      } else if ((e.key === "i" || e.key === "I") && isExpanded && hasAnswer && !isAnswerOpen) {
        // Press 'i' to show answer
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        onDecisionReveal?.();
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when expanded
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isExpanded, hasNext, hasPrev, onNext, onPrev, hasAnswer, isAnswerOpen, onDecisionReveal, handleClose]);

  const handleVideoPlay = () => setIsPlaying(true);
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
              "fixed inset-0 bg-black/80 z-[200] backdrop-blur-sm",
              "transition-opacity duration-300"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          />

          {/* Expanded Video Container */}
          <div
            className={cn(
              "fixed inset-0 z-[201] flex flex-col items-center justify-center pointer-events-none",
              // Top padding to separate from header (header is 88px)
              "pt-[100px] pb-6 px-4 md:px-12", 
              className
            )}
          >
            <motion.div
              key={`player-${video.id}`}
              layoutId={`video-${video.id}`}
              className="relative w-full max-w-6xl flex flex-col bg-dark-800 rounded-xl overflow-hidden shadow-2xl pointer-events-auto"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{ borderRadius: "12px", zIndex: 202 }} // Enforce border radius and z-index during animation
            >
              {/* Close Button */}
              <button
                onClick={(e) => handleClose(e)}
                className={cn(
                  "absolute top-4 right-4 z-[203] w-10 h-10",
                  "bg-black/60 hover:bg-black/80 rounded-full",
                  "flex items-center justify-center",
                  "transition-all duration-200",
                  "text-white hover:text-accent focus:outline-none",
                  showControls ? "opacity-100" : "opacity-0"
                )}
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

              {/* Navigation Buttons */}
              {hasPrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev?.();
                  }}
                  className={cn(
                    "absolute top-1/2 left-4 -translate-y-1/2 z-[103] w-12 h-12",
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
                  className={cn(
                    "absolute top-1/2 right-4 -translate-y-1/2 z-[103] w-12 h-12",
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
              <div className="relative aspect-video bg-black w-full">
                <video
                  ref={videoRef}
                  src={video.fileUrl}
                  poster={video.thumbnailUrl}
                  className="w-full h-full object-contain"
                  controls
                  controlsList="nodownload"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                >
                  Your browser does not support the video tag.
                </video>

              </div>

              {/* Video Info & Controls - Footer */}
              <div className="p-4 bg-dark-900/95 border-t border-white/10 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white line-clamp-1">{video.title}</h2>
                  {video.description && (
                    <p className="text-text-secondary text-sm line-clamp-1">{video.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {video.lawNumbers && video.lawNumbers.length > 0 && (
                    <span className="px-2 py-1 rounded bg-dark-800 border border-white/5 text-xs text-text-muted font-mono">
                      Law {video.lawNumbers.join(", ")}
                    </span>
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
