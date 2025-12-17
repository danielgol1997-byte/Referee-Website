"use client";

import { useRef, useState, MouseEvent, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface VideoCategoryCardProps {
  name: string;
  slug: string;
  icon: string;
  videoCount: number;
  index: number;
  color?: string;
}

export function VideoCategoryCard({ 
  name, 
  slug, 
  icon, 
  videoCount, 
  index,
  color = "#00E8F8"
}: VideoCategoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate mouse position relative to center of card
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Calculate rotation (max 15 degrees for video cards)
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

  return (
    <Link 
      href={`/library/videos/${slug}`}
      className={cn(
        "block h-full perspective-1000 transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
        }}
        className={cn(
          "group relative h-full min-h-[280px] rounded-3xl overflow-hidden",
          "bg-gradient-to-br from-dark-800/90 via-dark-800/70 to-dark-700/90",
          "border border-white/5 hover:border-accent/40",
          "backdrop-blur-md shadow-lg hover:shadow-2xl hover:shadow-accent/10",
          "transform-gpu flex flex-col items-center justify-center text-center p-8"
        )}
      >
        {/* Dynamic Glow Gradient Background */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "pointer-events-none z-10"
          )}
          style={{
            background: `linear-gradient(to bottom, transparent, transparent, ${color}0D)`
          }}
        />
        
        {/* Shimmer Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
        </div>

        {/* Floating Arrow (Absolute Top Right) */}
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <svg 
            className="w-6 h-6 text-accent" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>

        {/* Large Icon */}
        <div className={cn(
          "relative w-32 h-32 mb-6 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500",
          "bg-dark-900/30 border border-white/5 group-hover:border-accent/20",
          "shadow-inner",
          "group-hover:-translate-y-2 transform"
        )}
        style={{
          boxShadow: isHovered ? `0 0 30px ${color}26` : undefined
        }}
        >
          <div 
            className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-500"
            style={{
              backgroundColor: isHovered ? `${color}0D` : 'transparent'
            }}
          />
          <span className="text-7xl transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl">
            {icon}
          </span>
        </div>

        {/* Title and Count */}
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white group-hover:text-accent transition-colors duration-300 tracking-tight leading-tight mb-2">
            {name}
          </h3>
          <p className="text-sm text-text-muted group-hover:text-text-secondary transition-colors duration-300">
            {videoCount} video{videoCount !== 1 ? 's' : ''}
          </p>
          <div 
            className="h-1 w-12 mx-auto mt-4 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-75"
            style={{ backgroundColor: color, opacity: 0.3 }}
          />
        </div>

        {/* Bottom highlight line */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/0 to-transparent group-hover:via-accent/50 transition-all duration-500"
          style={{
            background: isHovered 
              ? `linear-gradient(to right, transparent, ${color}80, transparent)` 
              : 'linear-gradient(to right, transparent, transparent, transparent)'
          }}
        />
      </div>
    </Link>
  );
}
