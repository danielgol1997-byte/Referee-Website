"use client";

import { useRef, useState, MouseEvent, memo, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface VideoCard3DProps {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  viewCount: number;
  lawNumbers: number[];
  sanctionType?: string;
  restartType?: string;
  size?: 'small' | 'medium' | 'large';
  showDecisionButton?: boolean;
  forceHover?: boolean;
  isStatic?: boolean;
}

export const VideoCard3D = memo(function VideoCard3D({ 
  id,
  title, 
  thumbnailUrl,
  duration,
  viewCount,
  lawNumbers,
  sanctionType,
  restartType,
  size = 'medium',
  showDecisionButton = true,
  forceHover = false,
  isStatic = false
}: VideoCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  
  // Combine hover state with forceHover prop
  const effectiveHover = (isHovered || forceHover) && !isStatic;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isStatic) return;

    // Throttle to ~60fps
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Reduced tilt effect (max 15 degrees) for better performance
    const rotateY = (mouseX / width) * 15;
    const rotateX = (mouseY / height) * -15;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Reset rotation when forceHover changes or isStatic is true
  useEffect(() => {
    if ((forceHover && !isHovered) || isStatic) {
      // Apply slight rotation for keyboard focus
      setRotation({ x: 0, y: 0 });
    }
  }, [forceHover, isHovered, isStatic]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sizeClasses = {
    small: 'min-h-[200px]',
    medium: 'min-h-[280px]',
    large: 'min-h-[360px]'
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(${effectiveHover ? '30px' : '0px'})`,
        transition: effectiveHover ? "transform 0.2s ease-out" : "transform 0.4s ease-out",
      }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-dark-900 border border-dark-600",
        effectiveHover ? "border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : "shadow-2xl",
        "transform-gpu will-change-transform",
        "aspect-video",
        // Enforce z-index handling during shared layout transitions
        "z-0"
      )}
    >
      {/* Video Thumbnail */}
      <div className="relative w-full h-full bg-dark-900 overflow-hidden rounded-2xl">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 rounded-2xl",
              effectiveHover && "scale-105"
            )}
            loading="lazy"
            quality={85}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dark-800 to-dark-900" />
        )}
        
        {/* Subtle dark overlay on hover */}
        <div className={cn(
          "absolute inset-0 transition-all duration-500",
          effectiveHover ? "bg-dark-900/20" : "bg-dark-900/0"
        )} />
      </div>

      {/* Shimmer Effect */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-500",
        effectiveHover ? "opacity-10" : "opacity-0"
      )}>
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent -skew-x-12",
          effectiveHover ? "animate-shimmer" : "translate-x-[-100%]"
        )} />
      </div>
    </div>
  );
});
