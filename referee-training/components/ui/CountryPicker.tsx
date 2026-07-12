"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

interface CountryPickerProps {
  /** Selected ISO alpha-2 code (uppercase), or "" for none. */
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MENU_MAX_HEIGHT = 280;
const MENU_GAP = 6;

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

/**
 * Country select. The menu renders in a portal on document.body so it always
 * layers above surrounding UI, and it flips upwards automatically when there
 * isn't enough room below the trigger (matches components/ui/select.tsx).
 */
export function CountryPicker({
  value,
  onChange,
  placeholder = "Select country",
  className,
  disabled,
}: CountryPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [position, setPosition] = React.useState<MenuPosition | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query]);

  const updatePosition = React.useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = MENU_MAX_HEIGHT;
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
  }, []);

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
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={cn(
          "w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left",
          "bg-dark-900 border border-dark-600 text-white",
          "hover:border-accent/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200"
        )}
      >
        <span className={cn("flex items-center gap-2 truncate", !selected && "text-text-muted")}>
          {selected ? (
            <>
              <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
              {selected.name}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className={cn("w-4 h-4 shrink-0 text-text-secondary transition-transform duration-200", isOpen && "rotate-180")}
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
            className="fixed z-[1000] rounded-lg border border-dark-600 bg-dark-800 shadow-elevated"
            style={{
              left: position.left,
              width: position.width,
              ...(position.top !== undefined ? { top: position.top } : {}),
              ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
            }}
          >
            <div className="border-b border-dark-700 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full rounded-md bg-dark-900 border border-dark-600 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="max-h-60 overflow-auto p-1" style={{ overscrollBehavior: "contain" }}>
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                    c.code === value
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-white hover:bg-dark-700"
                  )}
                >
                  <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                  {c.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-text-muted">No countries found.</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
