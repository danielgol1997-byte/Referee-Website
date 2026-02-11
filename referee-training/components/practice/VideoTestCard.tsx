"use client";

import { useRef, useState, MouseEvent, memo } from "react";
import { cn } from "@/lib/utils";

export type VideoTestCardData = {
  id: string;
  name: string;
  totalClips: number;
  dueDate?: string | null;
  description?: string | null;
  passingScore?: number | null;
};

interface VideoTestCardProps {
  test: VideoTestCardData;
  onStart: (test: VideoTestCardData) => void;
  isStarting?: boolean;
  dueDateLabel?: string | null;
  canManage?: boolean;
  onEdit?: (test: VideoTestCardData) => void;
  onDelete?: (test: VideoTestCardData) => void;
  isDeleting?: boolean;
  highlighted?: boolean;
}

export const VideoTestCard = memo(function VideoTestCard({
  test,
  onStart,
  isStarting = false,
  dueDateLabel,
  canManage = false,
  onEdit,
  onDelete,
  isDeleting = false,
  highlighted = false,
}: VideoTestCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const effectiveHover = isHovered && !isStarting;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isStarting) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    const rotateY = (mouseX / width) * 15;
    const rotateX = (mouseY / height) * -15;
    setRotation({ x: rotateX, y: rotateY });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setRotation({ x: 0, y: 0 }); }}
      style={{
        transform: `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(${effectiveHover ? "30px" : "0px"})`,
        transition: effectiveHover ? "transform 0.2s ease-out" : "transform 0.4s ease-out",
      }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-dark-900 border border-dark-600",
        effectiveHover ? "border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : "shadow-2xl",
        highlighted && "ring-2 ring-cyan-400/80 border-cyan-400/80",
        "transform-gpu will-change-transform",
        "aspect-video min-h-[200px]"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900" />
      <div className={cn(
        "absolute inset-0 transition-all duration-500",
        effectiveHover ? "bg-dark-900/20" : "bg-dark-900/0"
      )} />
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-500",
        effectiveHover ? "opacity-10" : "opacity-0"
      )}>
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent -skew-x-12",
          effectiveHover ? "animate-shimmer" : "translate-x-[-100%]"
        )} />
      </div>

      <div className="relative z-10 flex flex-col h-full p-5 justify-between">
        <div>
          <h3 className="text-lg font-bold text-white line-clamp-2">{test.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span>
              {test.totalClips} {test.totalClips === 1 ? "video" : "videos"}
            </span>
            {test.passingScore !== null && test.passingScore !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-accent/30 text-accent">
                Pass {test.passingScore}%
              </span>
            )}
          </div>
          {dueDateLabel && (
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-semibold text-white border border-red-500/30" style={{ backgroundColor: "#FF1744" }}>
              {dueDateLabel}
            </span>
          )}
        </div>
        <button
          onClick={() => onStart(test)}
          disabled={isStarting || isDeleting}
          className={cn(
            "mt-3 w-full py-2.5 rounded-lg font-semibold text-dark-900 transition-all",
            "bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20",
            (isStarting || isDeleting) && "opacity-70 cursor-not-allowed"
          )}
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
              Starting…
            </span>
          ) : (
            "Start test"
          )}
        </button>
        {canManage && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(test)}
              disabled={isStarting || isDeleting}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-colors",
                "border-dark-500 text-text-secondary hover:text-white hover:border-cyan-500/60 hover:bg-dark-800/60",
                (isStarting || isDeleting) && "opacity-60 cursor-not-allowed"
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(test)}
              disabled={isStarting || isDeleting}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-colors",
                "border-status-danger/50 text-status-danger hover:bg-status-danger/10",
                (isStarting || isDeleting) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
