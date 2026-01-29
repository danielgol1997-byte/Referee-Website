"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedControlOption[];
  className?: string;
}

export function SegmentedControl({ value, onChange, options, className }: SegmentedControlProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-dark-900 border border-dark-600 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap",
            "hover:bg-dark-700/50 flex items-center gap-1.5",
            value === option.value
              ? "bg-accent text-dark-900 shadow-lg font-bold"
              : "text-text-secondary"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
