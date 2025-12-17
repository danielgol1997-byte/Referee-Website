"use client";

import { useRef, useState, MouseEvent } from "react";
import Link from "next/link";
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

    // Enhanced rotation for more dramatic 3D effect (max 12 degrees)
    const rotateY = (mouseX / width) * 12;
    const rotateX = (mouseY / height) * -12;

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
        transform: `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(${isHovered ? '20px' : '0px'}) scale3d(${isHovered ? 1.05 : 1}, ${isHovered ? 1.05 : 1}, 1)`,
        transition: isHovered ? "transform 0.15s ease-out" : "transform 0.4s ease-out",
      }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-dark-800 border border-dark-600 hover:border-cyan-500/40",
        "shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20",
        "transform-gpu will-change-transform",
        sizeClasses[size]
      )}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-dark-900 overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
            <svg className="w-16 h-16 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/20 to-transparent" />
        
        {/* Duration & Views */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white">
            <div className="bg-dark-900/80 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="font-medium">{formatDuration(duration)}</span>
            </div>
          </div>
          <div className="bg-dark-900/80 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1 text-xs text-white">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{viewCount}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-base font-semibold text-text-primary group-hover:text-cyan-500 transition-colors duration-300 line-clamp-2 mb-3">
          {title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {lawNumbers.length > 0 && lawNumbers.slice(0, 2).map((law) => (
            <span 
              key={law}
              className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 font-medium"
            >
              L{law}
            </span>
          ))}
          {restartType && (
            <span className="text-xs px-2 py-1 rounded-full bg-warm/10 border border-warm/30 text-warm font-medium">
              {restartType.split('_').map(w => w.charAt(0)).join('')}
            </span>
          )}
          {sanctionType && sanctionType !== 'NO_CARD' && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              sanctionType === 'YELLOW_CARD' && "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500",
              sanctionType === 'RED_CARD' && "bg-red-500/10 border border-red-500/30 text-red-500",
              sanctionType === 'DOUBLE_YELLOW' && "bg-orange-500/10 border border-orange-500/30 text-orange-500"
            )}>
              {sanctionType === 'YELLOW_CARD' && '🟨'}
              {sanctionType === 'RED_CARD' && '🟥'}
              {sanctionType === 'DOUBLE_YELLOW' && '🟨🟨'}
            </span>
          )}
        </div>

        {/* Actions */}
        <Link 
          href={`/library/videos/watch/${id}`}
          className={cn(
            "block w-full px-4 py-2 rounded-lg text-sm font-semibold text-center",
            "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900",
            "hover:from-cyan-400 hover:to-cyan-500",
            "transition-all duration-300",
            "shadow-md hover:shadow-lg hover:shadow-cyan-500/20"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Watch & Learn
          </span>
        </Link>
      </div>

      {/* Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
      </div>
    </div>
  );
}
