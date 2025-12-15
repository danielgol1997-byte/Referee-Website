"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min, max, disabled, ...props }, ref) => {
    const handleIncrement = () => {
      const currentValue = Number(value) || 0;
      const newValue = currentValue + 1;
      if (max === undefined || newValue <= max) {
        onChange(newValue);
      }
    };

    const handleDecrement = () => {
      const currentValue = Number(value) || 0;
      const newValue = currentValue - 1;
      if (min === undefined || newValue >= min) {
        onChange(newValue);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        // For optional fields, allow empty
        if (props.placeholder) {
          onChange(0);
        } else {
          onChange(min ?? 0);
        }
        return;
      }
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        if ((min === undefined || numVal >= min) && (max === undefined || numVal <= max)) {
          onChange(numVal);
        }
      }
    };

    const canIncrement = !disabled && (max === undefined || Number(value) < max);
    const canDecrement = !disabled && (min === undefined || Number(value) > min);

    return (
      <div className={cn("relative flex items-center", className)}>
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          className={cn(
            "flex h-11 w-full rounded-lg pl-4 pr-10 py-2 text-sm",
            "bg-dark-900 border border-dark-600",
            "text-white placeholder:text-text-muted",
            "focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            "[appearance:textfield]",
            "[&::-webkit-outer-spin-button]:appearance-none",
            "[&::-webkit-inner-spin-button]:appearance-none"
          )}
          {...props}
        />
        <div className="absolute right-1 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={!canIncrement}
            className={cn(
              "flex items-center justify-center w-8 h-5 rounded text-text-secondary",
              "hover:bg-dark-700 hover:text-accent transition-colors",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={!canDecrement}
            className={cn(
              "flex items-center justify-center w-8 h-5 rounded text-text-secondary",
              "hover:bg-dark-700 hover:text-accent transition-colors",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";
