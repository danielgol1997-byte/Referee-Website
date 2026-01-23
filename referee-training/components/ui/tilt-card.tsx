"use client";

import { useRef, useState, MouseEvent, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  href: string;
  title: string;
  gif: string;
  index: number;
  backgroundImage?: string;
}

export function CategoryCard({ href, title, gif, index, backgroundImage }: CategoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Small delay to ensure render
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

    // Calculate rotation (max 10 degrees)
    const rotateY = (mouseX / width) * 20; // Positive X means rotate Y positive
    const rotateX = (mouseY / height) * -20; // Positive Y means rotate X negative

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
      href={href} 
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
          "group relative h-full min-h-[240px] rounded-3xl overflow-hidden",
          backgroundImage ? "bg-dark-900" : "bg-gradient-to-br from-dark-800/90 via-dark-800/70 to-dark-700/90",
          "border border-white/5 hover:border-accent/40",
          "backdrop-blur-md shadow-lg hover:shadow-2xl hover:shadow-accent/10",
          "transform-gpu flex flex-col items-center justify-center text-center p-8"
        )}
      >
        {/* Background Image if present */}
        {backgroundImage && (
          <>
            <div className="absolute inset-0 z-0">
              <Image 
                src={backgroundImage} 
                alt="" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-110" 
              />
            </div>
            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-dark-900/90 via-dark-900/60 to-dark-900/80" />
          </>
        )}

        {/* Dynamic Glow Gradient Background */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "pointer-events-none z-10"
          )}
        />
        
        {/* Shimmer Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
        </div>

        {/* Large Centered Icon */}
        <div className={cn(
          "relative w-32 h-32 mb-8 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-500",
          "bg-dark-900/30 border border-white/5 group-hover:border-accent/20",
          "shadow-inner group-hover:shadow-[0_0_30px_rgba(232,224,154,0.15)]",
          "group-hover:-translate-y-2 transform"
        )}>
          <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-500" />
          <Image
            src={gif}
            alt={title}
            width={128}
            height={128}
            className="w-24 h-24 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
            unoptimized
          />
        </div>

        {/* Minimal Title */}
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white group-hover:text-accent transition-colors duration-300 tracking-tight leading-tight">
            {title}
          </h3>
          <div className="h-1 w-12 bg-accent/30 mx-auto mt-4 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-75" />
        </div>

        {/* Bottom highlight line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/0 to-transparent group-hover:via-accent/50 transition-all duration-500" />
      </div>
    </Link>
  );
}
