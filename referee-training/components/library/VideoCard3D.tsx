"use client";

import { useRef, useState, MouseEvent } from "react";
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
}

export function VideoCard3D({ 
  id,
  title, 
  thumbnailUrl,
  duration,
  viewCount,
  lawNumbers,
  sanctionType,
  restartType,
  size = 'medium',
  showDecisionButton = true
}: VideoCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Dramatic 3D tilt effect (max 25 degrees) for literal hovering block feel
    const rotateY = (mouseX / width) * 25;
    const rotateX = (mouseY / height) * -25;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

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
        transform: `perspective(1500px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(${isHovered ? '40px' : '0px'}) scale3d(${isHovered ? 1.05 : 1}, ${isHovered ? 1.05 : 1}, 1)`,
        transition: isHovered ? "transform 0.3s ease-out" : "transform 0.6s ease-out",
      }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-dark-900 border border-dark-600 hover:border-accent/40",
        "shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
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
            className="object-cover transition-transform duration-700 group-hover:scale-105 rounded-2xl"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dark-800 to-dark-900" />
        )}
        
        {/* Subtle dark overlay on hover */}
        <div className="absolute inset-0 bg-dark-900/0 group-hover:bg-dark-900/20 transition-all duration-500" />
      </div>

      {/* Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
      </div>
    </div>
  );
}
