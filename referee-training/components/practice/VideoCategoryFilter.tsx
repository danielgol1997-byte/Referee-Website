"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tag = {
  id: string;
  name: string;
  slug: string;
  color?: string;
};

type TagCategory = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  tags: Tag[];
};

export type CategoryFilterValue = {
  categoryTags: string[];
};

const CATEGORY_SLUG = "category";

export function VideoCategoryFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
  disabled?: boolean;
}) {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch("/api/library/tags");
        if (response.ok) {
          const data = await response.json();
          setTagCategories(data.tagCategories || []);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTags();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const categoryGroup = useMemo(
    () => tagCategories.find((category) => category.slug === CATEGORY_SLUG),
    [tagCategories]
  );

  const options = categoryGroup?.tags || [];
  const selectedValues = value.categoryTags || [];

  const selectedItems = selectedValues
    .map((val) => options.find((opt) => opt.slug === val))
    .filter(Boolean) as Tag[];

  const removeValue = (slug: string) => {
    onChange({
      categoryTags: selectedValues.filter((val) => val !== slug),
    });
  };

  const toggleValue = (slug: string) => {
    if (selectedValues.includes(slug)) {
      removeValue(slug);
      return;
    }
    onChange({ categoryTags: [...selectedValues, slug] });
  };

  const labelColor = categoryGroup?.color || "#FF6B6B";

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
        Category
      </label>
      <button
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen((prev) => !prev)}
        disabled={disabled || isLoading}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm transition-all",
          disabled || isLoading
            ? "bg-dark-900/50 border-dark-700 text-text-muted cursor-not-allowed"
            : "bg-dark-900 text-text-primary hover:border-opacity-100 cursor-pointer"
        )}
        style={{ borderColor: `${labelColor}60` }}
      >
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: labelColor }} />
          {selectedItems.length > 0 ? `${selectedItems.length} selected` : "Select category..."}
        </span>
        <svg
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedItems.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 relative group"
              style={{
                backgroundColor: `${item.color || labelColor}20`,
                borderColor: item.color || labelColor,
                color: item.color || labelColor,
              }}
            >
              <button
                type="button"
                onClick={() => removeValue(item.slug)}
                className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform"
                style={{ backgroundColor: item.color || labelColor }}
              >
                ×
              </button>
              <span className="ml-2">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && (
        <div
          className="absolute z-50 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg bg-dark-900 border-2 shadow-2xl"
          style={{ borderColor: labelColor, overscrollBehavior: "contain" }}
        >
          {options.length > 0 ? (
            <div className="p-2">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.slug);
                const itemColor = option.color || labelColor;
                return (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => toggleValue(option.slug)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      isSelected ? "bg-opacity-20" : "hover:bg-dark-800"
                    )}
                    style={isSelected ? { backgroundColor: `${itemColor}20` } : {}}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: itemColor }} />
                    <span className="text-sm text-text-primary flex-1">{option.name}</span>
                    {isSelected && (
                      <svg className="w-4 h-4" style={{ color: itemColor }} fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-text-muted text-center">No categories available</div>
          )}
        </div>
      )}
    </div>
  );
}
