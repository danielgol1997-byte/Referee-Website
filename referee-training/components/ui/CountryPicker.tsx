"use client";

import * as React from "react";
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

export function CountryPicker({
  value,
  onChange,
  placeholder = "Select country",
  className,
  disabled,
}: CountryPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-left",
          "bg-dark-900 border border-dark-600 text-white",
          "hover:border-accent/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200"
        )}
      >
        <span className={cn("flex items-center gap-2", !selected && "text-text-muted")}>
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
          className={cn("w-4 h-4 text-text-secondary transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 z-50 w-full rounded-lg border border-dark-600 bg-dark-800 shadow-elevated">
          <div className="p-2 border-b border-dark-700">
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
        </div>
      )}
    </div>
  );
}
