"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

const MENU_MAX_HEIGHT = 240; // matches max-h-60
const MENU_GAP = 6;

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

/**
 * Custom select. The menu renders in a portal on document.body so it always
 * layers above surrounding UI (tables, cards, sticky headers), and it flips
 * upwards automatically when there isn't enough room below the trigger.
 */
export function Select({ value, onChange, options, placeholder, className }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<MenuPosition | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const updatePosition = React.useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Estimate the menu height (option row ≈ 36px + padding), capped at max.
    const estimatedHeight = Math.min(options.length * 36 + 8, MENU_MAX_HEIGHT);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    setPosition({
      left: rect.left,
      width: rect.width,
      ...(openUpwards
        ? { bottom: window.innerHeight - rect.top + MENU_GAP }
        : { top: rect.bottom + MENU_GAP }),
    });
  }, [options.length]);

  const open = () => {
    updatePosition();
    setIsOpen(true);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    // Keep the portal-positioned menu glued to the trigger while the page
    // scrolls or resizes.
    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={cn(
          "w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left",
          "bg-dark-900 border border-dark-600 text-white",
          "hover:border-accent/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          "transition-all duration-200"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-text-muted")}>
          {selectedOption?.label || placeholder || "Select..."}
        </span>
        <svg 
          className={cn(
            "w-4 h-4 shrink-0 text-text-secondary transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && position && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-[1000] rounded-lg border border-dark-600 bg-dark-800 shadow-elevated",
              "animate-in fade-in-0 zoom-in-95 duration-200",
              "max-h-60 overflow-auto"
            )}
            style={{
              left: position.left,
              width: position.width,
              ...(position.top !== undefined ? { top: position.top } : {}),
              ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                    option.value === value 
                      ? "bg-accent/10 text-accent" 
                      : "text-text-secondary hover:text-white hover:bg-dark-700"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
