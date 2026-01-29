"use client";

import { cn } from "@/lib/utils";

export type QuestionSourceValue = "IFAB_ONLY" | "CUSTOM_ONLY" | "BOTH";

interface ThreeStateToggleProps {
  value: QuestionSourceValue;
  onChange: (value: QuestionSourceValue) => void;
  className?: string;
  disabled?: boolean;
}

export function ThreeStateToggle({ value, onChange, className, disabled }: ThreeStateToggleProps) {
  const options: { value: QuestionSourceValue; label: string; color: string }[] = [
    { value: "IFAB_ONLY", label: "IFAB", color: "bg-green-500" },
    { value: "BOTH", label: "Both", color: "bg-amber-500" },
    { value: "CUSTOM_ONLY", label: "Custom", color: "bg-purple-500" },
  ];

  return (
    <div className={cn("flex items-center rounded-lg bg-dark-900 border border-dark-600 p-1 gap-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
            "hover:bg-dark-700/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value === option.value
              ? `${option.color} text-white shadow-lg`
              : "text-text-secondary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
