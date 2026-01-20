"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoCard3D } from "./VideoCard3D";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  sanctionType?: string;
  restartType?: string;
}

interface VideoCarousel3DProps {
  videos: Video[];
  autoplay?: boolean;
  autoplayInterval?: number;
  onVideoClick?: (videoId: string) => void;
}

export function VideoCarousel3D({ 
  videos, 
  autoplay = false,
  autoplayInterval = 5000,
  onVideoClick
}: VideoCarousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay
  useEffect(() => {
    if (!autoplay || isPaused || videos.length <= 1) return;

    const timer = setInterval(nextSlide, autoplayInterval);
    return () => clearInterval(timer);
  }, [autoplay, isPaused, nextSlide, autoplayInterval, videos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (videos.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-secondary">No videos available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Container */}
      <div className="relative h-[400px] flex items-center justify-center bg-transparent" style={{ perspective: '2000px' }}>
        {/* Cards */}
        <div className="relative w-full max-w-2xl mx-auto">
          {videos.map((video, index) => {
            const length = videos.length;
            
            // Calculate shortest distance for circular carousel
            let offset = index - currentIndex;
            if (offset > length / 2) offset -= length;
            else if (offset < -length / 2) offset += length;

            const isCenter = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;
            // Show more context for better 3D effect
            const isVisible = Math.abs(offset) <= 2;

            if (!isVisible) return null;

            return (
              <button
                key={video.id}
                onClick={() => {
                  if (isCenter && onVideoClick) {
                    onVideoClick(video.id);
                  } else if (!isCenter) {
                    // Click on non-center card brings it to center
                    goToSlide(index);
                  }
                }}
                className={cn(
                  "absolute top-1/2 left-1/2 w-full max-w-md transition-all duration-700 ease-out origin-center",
                  !isVisible && "opacity-0 pointer-events-none",
                  isCenter ? "cursor-pointer" : "cursor-pointer"
                )}
                style={{
                  transform: `
                    translate(-50%, -50%)
                    translateX(${offset * 65}%)
                    scale(${isCenter ? 1 : 0.8})
                    translateZ(${isCenter ? 120 : -150}px)
                    rotateY(${offset * -35}deg)
                  `,
                  zIndex: isCenter ? 30 : 20 - Math.abs(offset),
                  opacity: isCenter ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.5),
                }}
              >
                <VideoCard3D {...video} size="large" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {videos.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-40",
              "w-12 h-12 rounded-full bg-dark-800/90 backdrop-blur-sm border border-dark-600",
              "flex items-center justify-center",
              "text-text-primary hover:text-accent hover:border-accent/50",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95",
              "shadow-lg hover:shadow-accent/20"
            )}
            aria-label="Previous video"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-40",
              "w-12 h-12 rounded-full bg-dark-800/90 backdrop-blur-sm border border-dark-600",
              "flex items-center justify-center",
              "text-text-primary hover:text-accent hover:border-accent/50",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95",
              "shadow-lg hover:shadow-accent/20"
            )}
            aria-label="Next video"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicators */}
      {videos.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "transition-all duration-300",
                currentIndex === index 
                  ? "w-8 h-2 bg-accent rounded-full shadow-lg shadow-accent/50" 
                  : "w-2 h-2 bg-dark-600 hover:bg-dark-500 rounded-full"
              )}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="md:hidden text-center mt-4">
        <p className="text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Swipe to browse
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </p>
      </div>
    </div>
  );
}
