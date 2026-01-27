"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: number; // 0-100
  fileName?: string;
  fileSize?: number;
  uploadSpeed?: number; // bytes per second
  className?: string;
}

export function UploadProgress({ 
  progress, 
  fileName = "video.mp4", 
  fileSize,
  uploadSpeed,
  className 
}: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const estimatedTimeRemaining = fileSize && uploadSpeed 
    ? ((fileSize * (100 - progress) / 100) / uploadSpeed)
    : null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Uploading Video</p>
            <p className="text-xs text-text-muted truncate max-w-[200px]">{fileName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{Math.round(progress)}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-dark-800 rounded-full overflow-hidden border border-dark-600">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 relative overflow-hidden"
        >
          {/* Animated shimmer effect */}
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-4">
          {fileSize && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{formatBytes(fileSize)}</span>
            </div>
          )}
          {uploadSpeed && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{formatSpeed(uploadSpeed)}</span>
            </div>
          )}
        </div>
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(estimatedTimeRemaining)} remaining</span>
          </div>
        )}
      </div>

      {/* Stages indicator */}
      <div className="flex items-center gap-2">
        {[
          { label: "Uploading", threshold: 0 },
          { label: "Processing", threshold: 90 },
          { label: "Complete", threshold: 100 },
        ].map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                progress >= stage.threshold
                  ? "bg-cyan-500 scale-110"
                  : "bg-dark-600"
              )}
            />
            <span
              className={cn(
                "text-xs transition-colors",
                progress >= stage.threshold
                  ? "text-cyan-400 font-medium"
                  : "text-text-muted"
              )}
            >
              {stage.label}
            </span>
            {i < 2 && (
              <svg className="w-3 h-3 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact version for inline use
export function UploadProgressCompact({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-5 h-5 rounded-full border-2 border-cyan-500 border-t-transparent flex-shrink-0"
      />
      <div className="flex-1">
        <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden border border-dark-600">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600"
          />
        </div>
      </div>
      <span className="text-sm font-semibold text-cyan-400 flex-shrink-0 w-12 text-right">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
