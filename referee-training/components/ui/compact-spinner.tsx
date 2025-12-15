"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CompactSpinnerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function CompactSpinner({
  value,
  onChange,
  min = 1,
  max = 100,
  disabled = false,
  className,
}: CompactSpinnerProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [dragStartValue, setDragStartValue] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value.toString());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync input value with prop
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const clamp = (val: number) => Math.max(min, Math.min(max, Math.round(val)));

  const increment = () => {
    if (!disabled && value < max) {
      onChange(clamp(value + 1));
    }
  };

  const decrement = () => {
    if (!disabled && value > min) {
      onChange(clamp(value - 1));
    }
  };

  // Handle wheel scroll - locks scroll when hovering
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? -1 : 1;
      onChange(clamp(value + delta));
    },
    [disabled, value, onChange, min, max]
  );

  // Attach wheel listener with passive: false to prevent page scroll
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartValue(value);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY - e.clientY;
      const sensitivity = 3; // pixels per unit
      const deltaValue = Math.round(deltaY / sensitivity);
      onChange(clamp(dragStartValue + deltaValue));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStartY, dragStartValue, onChange, min, max]);

  // Handle text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numVal = parseInt(inputValue, 10);
    if (!isNaN(numVal)) {
      onChange(clamp(numVal));
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInputValue(value.toString());
      setIsEditing(false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    }
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center gap-2 select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Value Display / Input */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          "w-16 h-10 rounded-lg",
          "bg-dark-900 border border-dark-600",
          "transition-all duration-200",
          !disabled && !isEditing && "cursor-ns-resize",
          isDragging && "border-accent shadow-[0_0_12px_rgba(0,232,248,0.3)]",
          isEditing && "border-accent/50 ring-2 ring-accent/20"
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className={cn(
              "w-full h-full bg-transparent text-center",
              "text-lg font-bold text-accent",
              "focus:outline-none",
              "[appearance:textfield]",
              "[&::-webkit-outer-spin-button]:appearance-none",
              "[&::-webkit-inner-spin-button]:appearance-none"
            )}
          />
        ) : (
          <span className="text-lg font-bold text-accent">
            {value}
          </span>
        )}
      </div>

      {/* Up/Down Buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          className={cn(
            "flex items-center justify-center",
            "w-6 h-4 rounded",
            "bg-dark-700 border border-dark-600",
            "text-text-secondary",
            "transition-all duration-150",
            "hover:bg-dark-600 hover:text-accent hover:border-accent/30",
            "active:scale-95",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-dark-700 disabled:hover:text-text-secondary disabled:hover:border-dark-600"
          )}
          title="Increase"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          className={cn(
            "flex items-center justify-center",
            "w-6 h-4 rounded",
            "bg-dark-700 border border-dark-600",
            "text-text-secondary",
            "transition-all duration-150",
            "hover:bg-dark-600 hover:text-accent hover:border-accent/30",
            "active:scale-95",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-dark-700 disabled:hover:text-text-secondary disabled:hover:border-dark-600"
          )}
          title="Decrease"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

