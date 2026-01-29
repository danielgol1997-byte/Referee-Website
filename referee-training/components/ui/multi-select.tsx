"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface MultiSelectProps {
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ value, onChange, options, placeholder, className }: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [openUpward, setOpenUpward] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const availableOptions = options.filter(opt => !value.includes(opt.value));
  const selectedOptions = options.filter(opt => value.includes(opt.value));
  
  // Filter options based on search query
  const filteredOptions = availableOptions.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const addValue = (val: string | number) => {
    onChange([...value, val]);
    setSearchQuery("");
    setIsOpen(false);
  };

  const removeValue = (val: string | number) => {
    onChange(value.filter(v => v !== val));
  };

  // Calculate dropdown position when opening
  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 350; // Estimated max dropdown height including search
      
      // Open upward if not enough space below but enough space above
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  // Update position on scroll or resize
  React.useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const dropdownHeight = 350;
        
        setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Items as Chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium"
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => removeValue(option.value)}
                className="hover:bg-accent/20 rounded-full p-0.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Button with Dropdown */}
      {availableOptions.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-dark-800 border border-dark-600 text-white",
              "hover:border-accent/30 hover:bg-dark-700 transition-all duration-200"
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {placeholder || "Add item"}
          </button>
          
          {isOpen && (
            <div
              className={cn(
                "fixed min-w-[240px] max-w-[320px] rounded-lg border border-dark-600 bg-dark-800 shadow-2xl",
                "animate-in fade-in-0 zoom-in-95 duration-200",
                "z-[9999]"
              )}
              style={{
                top: buttonRef.current ? 
                  `${buttonRef.current.getBoundingClientRect().bottom + 8}px`
                  : undefined,
                left: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().left}px` : undefined,
                transform: openUpward ? 'translateY(-100%) translateY(-48px)' : undefined,
              }}
            >
              {/* Search Input */}
              {availableOptions.length > 5 && (
                <div className="p-2 border-b border-dark-600">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-3 py-2 pl-9 text-sm bg-dark-900 border border-dark-600 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                      autoFocus
                    />
                    <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Options List */}
              <div 
                className="max-h-[280px] overflow-y-auto p-1"
                style={{
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => addValue(option.value)}
                      className={cn(
                        "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                        "text-text-secondary hover:text-white hover:bg-dark-700"
                      )}
                    >
                      {option.label}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-text-muted">
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {selectedOptions.length === 0 && (
        <p className="text-sm text-text-muted italic">No items selected</p>
      )}
    </div>
  );
}
