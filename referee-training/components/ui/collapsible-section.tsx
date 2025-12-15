"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const CollapsibleSection = React.forwardRef<HTMLDivElement, CollapsibleSectionProps>(({ 
  title, 
  description, 
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  icon,
  badge
}, ref) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(defaultOpen);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  // Combine refs
  React.useImperativeHandle(ref, () => sectionRef.current as HTMLDivElement);

  return (
    <div ref={sectionRef} className="rounded-lg border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden scroll-mt-28">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-dark-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              {icon}
            </div>
          )}
          <div className="text-left flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {badge && badge}
            </div>
            {description && (
              <p className="text-sm text-text-secondary mt-1">{description}</p>
            )}
          </div>
        </div>
        
        <svg 
          className={cn(
            "w-5 h-5 text-text-secondary transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="border-t border-dark-600 p-6 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
});

CollapsibleSection.displayName = "CollapsibleSection";
