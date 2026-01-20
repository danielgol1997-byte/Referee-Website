"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type RAPCategory = 
  | "all"
  | "decision-making"
  | "management"
  | "offside"
  | "teamwork"
  | "laws-of-the-game";

interface RAPCategoryTab {
  id: RAPCategory;
  label: string;
  code?: string; // UEFA RAP code (A-G, L)
}

const RAP_CATEGORIES: RAPCategoryTab[] = [
  { id: "decision-making", label: "Decision Making", code: "A" },
  { id: "management", label: "Management", code: "B" },
  { id: "offside", label: "Offside", code: "C" },
  { id: "teamwork", label: "Teamwork", code: "D" },
  { id: "laws-of-the-game", label: "Laws of the Game", code: "L" },
];

interface RAPCategoryTabsProps {
  activeCategory: RAPCategory;
  onCategoryChange: (category: RAPCategory) => void;
  videoCounts?: Record<RAPCategory, number>;
  className?: string;
}

/**
 * RAPCategoryTabs - UEFA RAP 2025:1 Category Tabs
 * 
 * Clean, professional tab navigation for RAP categories.
 * NO EMOJIS. UEFA STYLE ONLY.
 */
export function RAPCategoryTabs({
  activeCategory,
  onCategoryChange,
  videoCounts,
  className,
}: RAPCategoryTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {RAP_CATEGORIES.map((category) => {
            const isActive = category.id === activeCategory;
            const count = videoCounts?.[category.id];

            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "px-6 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap rounded-lg",
                  "border-2 transition-all duration-200",
                  isActive
                    ? "border-accent bg-accent/10 text-accent shadow-lg shadow-accent/20"
                    : "border-dark-600 bg-dark-800/50 text-text-secondary hover:text-text-primary hover:border-accent/50 hover:bg-dark-700/50"
                )}
                title={isActive ? "Click to deselect" : `Filter by ${category.label}`}
              >
                <span>{category.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                      isActive
                        ? "bg-accent/30 text-accent"
                        : "bg-dark-700 text-text-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Dropdown */}
      <div className="block md:hidden">
        <select
          value={activeCategory}
          onChange={(e) => onCategoryChange(e.target.value as RAPCategory)}
          className={cn(
            "w-full px-4 py-3 rounded-lg",
            "bg-dark-900 border-2 border-dark-600",
            "text-text-primary font-semibold text-sm",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          )}
        >
          {RAP_CATEGORIES.map((category) => {
            const count = videoCounts?.[category.id];
            return (
              <option key={category.id} value={category.id}>
                {category.label}
                {count !== undefined && count > 0 ? ` (${count})` : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

/**
 * Helper function to get RAP category code from slug
 */
export function getRAPCategoryCode(slug: RAPCategory): string | null {
  const category = RAP_CATEGORIES.find((cat) => cat.id === slug);
  return category?.code || null;
}

/**
 * Helper function to get RAP category from code
 */
export function getRAPCategoryFromCode(code: string): RAPCategory | null {
  const category = RAP_CATEGORIES.find((cat) => cat.code === code);
  return category?.id || null;
}
