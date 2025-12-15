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
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const availableOptions = options.filter(opt => !value.includes(opt.value));
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
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
    setIsOpen(false);
  };

  const removeValue = (val: string | number) => {
    onChange(value.filter(v => v !== val));
  };

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
                "absolute top-full mt-2 z-50 min-w-[200px] rounded-lg border border-dark-600 bg-dark-800 shadow-elevated",
                "animate-in fade-in-0 zoom-in-95 duration-200",
                "max-h-60 overflow-auto"
              )}
            >
              <div className="p-1">
                {availableOptions.map((option) => (
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
                ))}
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
