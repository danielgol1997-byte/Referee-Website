"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type VideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  source: string;
  poster?: string;
  loopZoneStart?: number;
  loopZoneEnd?: number;
  showLoopControls?: boolean;
};

export function VideoPlayer({ 
  source, 
  poster, 
  className, 
  loopZoneStart: adminLoopStart, 
  loopZoneEnd: adminLoopEnd,
  showLoopControls = true,
  ...props 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [customLoopStart, setCustomLoopStart] = useState<number | undefined>(adminLoopStart);
  const [customLoopEnd, setCustomLoopEnd] = useState<number | undefined>(adminLoopEnd);
  const [isSettingLoop, setIsSettingLoop] = useState(false);
  const [pendingLoopStart, setPendingLoopStart] = useState<number | undefined>();


  // Update loop zone when admin values change
  useEffect(() => {
    setCustomLoopStart(adminLoopStart);
    setCustomLoopEnd(adminLoopEnd);
  }, [adminLoopStart, adminLoopEnd]);

  // Handle time update to enforce loop zone
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (!isLoopEnabled) return;

    const currentTime = videoRef.current.currentTime;
    const loopStart = customLoopStart ?? 0;
    const loopEnd = customLoopEnd ?? videoRef.current.duration;

    // Loop back to start if we exceed the end
    if (currentTime >= loopEnd) {
      videoRef.current.currentTime = loopStart;
    }

    // Jump to loop start if we're before it
    if (currentTime < loopStart) {
      videoRef.current.currentTime = loopStart;
    }
  };

  const toggleLoop = () => {
    if (!isLoopEnabled && customLoopStart !== undefined && customLoopEnd !== undefined) {
      // Enable loop and seek to loop start
      setIsLoopEnabled(true);
      if (videoRef.current) {
        videoRef.current.currentTime = customLoopStart;
      }
    } else if (!isLoopEnabled) {
      // No loop zone set, just enable regular loop
      setIsLoopEnabled(true);
    } else {
      // Disable loop
      setIsLoopEnabled(false);
    }
  };

  const setLoopAtCurrentTime = () => {
    if (!videoRef.current) return;

    if (!isSettingLoop) {
      // Start setting loop
      setPendingLoopStart(videoRef.current.currentTime);
      setIsSettingLoop(true);
    } else {
      // Complete loop setting
      const start = pendingLoopStart!;
      const end = videoRef.current.currentTime;
      setCustomLoopStart(Math.min(start, end));
      setCustomLoopEnd(Math.max(start, end));
      setIsSettingLoop(false);
      setPendingLoopStart(undefined);
    }
  };

  const clearCustomLoop = () => {
    setCustomLoopStart(adminLoopStart);
    setCustomLoopEnd(adminLoopEnd);
    setIsLoopEnabled(false);
  };

  const hasAdminLoop = adminLoopStart !== undefined && adminLoopEnd !== undefined;
  const hasCustomLoop = customLoopStart !== undefined && customLoopEnd !== undefined;

  return (
    <div className={cn("w-full overflow-hidden rounded-uefa-lg bg-black shadow-uefa-elevated relative", className)}>
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        poster={poster}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        {...props}
      >
        <source src={source} />
        Your browser does not support the video tag.
      </video>

      {/* Loop Controls Overlay */}
      {showLoopControls && (
        <div className="absolute bottom-14 right-4 flex flex-col gap-2">
          {/* Loop Toggle */}
          <button
            onClick={toggleLoop}
            className={cn(
              "px-3 py-2 rounded-lg backdrop-blur-md transition-all text-sm font-medium flex items-center gap-2 shadow-lg",
              isLoopEnabled
                ? "bg-cyan-500/90 text-white"
                : "bg-black/60 text-white/80 hover:bg-black/80"
            )}
            title={isLoopEnabled ? "Disable Loop" : "Enable Loop"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoopEnabled ? "Loop On" : "Loop Off"}
          </button>

          {/* Set Loop Zone */}
          <button
            onClick={setLoopAtCurrentTime}
            className={cn(
              "px-3 py-2 rounded-lg backdrop-blur-md transition-all text-xs font-medium shadow-lg",
              isSettingLoop
                ? "bg-yellow-500/90 text-white animate-pulse"
                : "bg-black/60 text-white/80 hover:bg-black/80"
            )}
            title={isSettingLoop ? "Click again to complete loop zone" : "Set loop start"}
          >
            {isSettingLoop ? "Set End" : "Set Loop"}
          </button>

          {/* Clear Custom Loop */}
          {hasCustomLoop && !hasAdminLoop && (
            <button
              onClick={clearCustomLoop}
              className="px-3 py-2 rounded-lg backdrop-blur-md bg-red-500/80 hover:bg-red-500 text-white transition-all text-xs font-medium shadow-lg"
              title="Clear custom loop"
            >
              Clear
            </button>
          )}

          {/* Reset to Admin Loop */}
          {hasCustomLoop && hasAdminLoop && (customLoopStart !== adminLoopStart || customLoopEnd !== adminLoopEnd) && (
            <button
              onClick={clearCustomLoop}
              className="px-3 py-2 rounded-lg backdrop-blur-md bg-blue-500/80 hover:bg-blue-500 text-white transition-all text-xs font-medium shadow-lg"
              title="Reset to suggested loop"
            >
              Reset
            </button>
          )}

          {/* Loop Info */}
          {hasCustomLoop && (
            <div className="px-3 py-2 rounded-lg backdrop-blur-md bg-black/80 text-white text-xs shadow-lg">
              <div className="flex items-center gap-1 mb-1">
                {hasAdminLoop && customLoopStart === adminLoopStart && customLoopEnd === adminLoopEnd && (
                  <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                <span className="font-semibold">Loop Zone</span>
              </div>
              <div className="text-white/80">
                {formatTime(customLoopStart)} - {formatTime(customLoopEnd)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}


