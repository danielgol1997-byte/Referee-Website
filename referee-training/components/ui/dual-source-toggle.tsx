"use client";

import { cn } from "@/lib/utils";

interface DualSourceToggleProps {
  includeIfab: boolean;
  includeCustom: boolean;
  onIfabChange: (value: boolean) => void;
  onCustomChange: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function DualSourceToggle({
  includeIfab,
  includeCustom,
  onIfabChange,
  onCustomChange,
  className,
  disabled = false,
}: DualSourceToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-4 px-4 py-2.5 rounded-full border border-dark-600 bg-dark-900", className)}>
      {/* IFAB Toggle */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs font-medium transition-colors",
          includeIfab ? "text-green-400" : "text-text-muted"
        )}>
          IFAB
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onIfabChange(!includeIfab)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-green-500/20",
            includeIfab ? "bg-green-500" : "bg-dark-700"
          )}
          role="switch"
          aria-checked={includeIfab}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
              includeIfab ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-dark-600" />

      {/* Custom Toggle */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs font-medium transition-colors",
          includeCustom ? "text-purple-400" : "text-text-muted"
        )}>
          Custom
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCustomChange(!includeCustom)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/20",
            includeCustom ? "bg-purple-500" : "bg-dark-700"
          )}
          role="switch"
          aria-checked={includeCustom}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
              includeCustom ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
