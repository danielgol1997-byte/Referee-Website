"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";

export interface AdminVideoFilters {
  search: string;
  activeStatus: 'all' | 'active' | 'inactive';
  featuredStatus: 'all' | 'featured' | 'normal';
  customTagFilters: Record<string, string[]>;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  parentCategory?: string;
  color?: string;
  order?: number;
}

interface TagCategory {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  canBeCorrectAnswer: boolean;
  order: number;
  tags: Tag[];
}

interface AdminVideoFilterBarProps {
  filters: AdminVideoFilters;
  onFiltersChange: (filters: AdminVideoFilters) => void;
}

type FilterType = `custom:${string}`;

const CUSTOM_FILTER_PREFIX = 'custom:';
const DEFAULT_VISIBLE_FILTERS: FilterType[] = [];
const GROUP_COLORS: Record<string, string> = {
  laws: '#9B72CB',
  category: '#FF6B6B',
  criteria: '#FFD93D',
  restarts: '#4A90E2',
  sanction: '#EC4899',
  scenario: '#6BCF7F',
};

const ACTIVE_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const FEATURED_STATUS_OPTIONS = [
  { value: "all", label: "All Videos" },
  { value: "featured", label: "Featured" },
  { value: "normal", label: "Normal" },
];

export function AdminVideoFilterBar({ filters, onFiltersChange }: AdminVideoFilterBarProps) {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleFilters, setVisibleFilters] = useState<FilterType[]>([]);
  const [filterOrder, setFilterOrder] = useState<FilterType[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load saved preferences after hydration
  useEffect(() => {
    setIsClient(true);
    const savedVisible = localStorage.getItem('adminVideoFilterPreferences');
    if (savedVisible) {
      try {
        setVisibleFilters(JSON.parse(savedVisible));
      } catch (e) {
        console.error('Failed to load filter preferences');
      }
    }

    const savedOrder = localStorage.getItem('adminVideoFilterOrder');
    if (savedOrder) {
      try {
        setFilterOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to load filter order');
      }
    }
  }, []);

  // Fetch tags on mount
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/library/tags');
        if (response.ok) {
          const data = await response.json();
          setTagCategories(data.tagCategories || []);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTags();
  }, []);

  const tagCategoryMap = useMemo(
    () => tagCategories.reduce((acc, category) => {
      acc[category.slug] = category;
      return acc;
    }, {} as Record<string, TagCategory>),
    [tagCategories]
  );

  const customFilterTypes = useMemo(
    () => tagCategories.map(category => `${CUSTOM_FILTER_PREFIX}${category.slug}` as FilterType),
    [tagCategories]
  );

  // Initialize filter order when tag categories load
  useEffect(() => {
    if (customFilterTypes.length === 0) {
      return;
    }

    const savedOrder = localStorage.getItem('adminVideoFilterOrder');
    
    setFilterOrder(prev => {
      const next = savedOrder ? JSON.parse(savedOrder) : [...customFilterTypes];
      let changed = false;
      customFilterTypes.forEach(type => {
        if (!next.includes(type)) {
          next.push(type);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('adminVideoFilterOrder', JSON.stringify(next));
      }
      return next;
    });
  }, [customFilterTypes]);

  // Close settings on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustomFilter = (type: FilterType): type is `custom:${string}` =>
    type.startsWith(CUSTOM_FILTER_PREFIX);
  const getCustomSlug = (type: FilterType) => type.replace(CUSTOM_FILTER_PREFIX, '');

  const addFilter = (type: FilterType, value: string) => {
    if (isCustomFilter(type)) {
      const slug = getCustomSlug(type);
      const currentValues = filters.customTagFilters?.[slug] || [];
      if (!currentValues.includes(value)) {
        onFiltersChange({
          ...filters,
          customTagFilters: {
            ...(filters.customTagFilters || {}),
            [slug]: [...currentValues, value],
          },
        });
      }
    }
  };

  const removeFilter = (type: FilterType, value: string) => {
    if (isCustomFilter(type)) {
      const slug = getCustomSlug(type);
      const currentValues = filters.customTagFilters?.[slug] || [];
      onFiltersChange({
        ...filters,
        customTagFilters: {
          ...(filters.customTagFilters || {}),
          [slug]: currentValues.filter((v: any) => v !== value),
        },
      });
    }
  };

  const clearAllTagFilters = () => {
    onFiltersChange({
      ...filters,
      customTagFilters: {},
    });
  };

  const toggleFilterVisibility = (type: FilterType) => {
    const newVisible = visibleFilters.includes(type)
      ? visibleFilters.filter(f => f !== type)
      : [...visibleFilters, type];
    
    setVisibleFilters(newVisible);
    localStorage.setItem('adminVideoFilterPreferences', JSON.stringify(newVisible));
  };

  const orderedVisibleFilters = filterOrder.filter(f => visibleFilters.includes(f));

  const customFilterCount = Object.values(filters.customTagFilters || {}).reduce(
    (count, values) => count + values.length,
    0
  );

  const getFilterConfig = (type: FilterType) => {
    if (isCustomFilter(type)) {
      const slug = getCustomSlug(type);
      const category = tagCategoryMap[slug];
      return {
        label: category?.name || slug,
        color: category?.color || GROUP_COLORS[slug] || '#00E8F8',
        customSlug: slug,
      };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search videos by name..."
            className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        {/* Active Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status
          </label>
          <SegmentedControl
            value={filters.activeStatus}
            onChange={(val) => onFiltersChange({ ...filters, activeStatus: val as any })}
            options={ACTIVE_STATUS_OPTIONS}
            className="w-full"
          />
        </div>

        {/* Featured Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Featured
          </label>
          <SegmentedControl
            value={filters.featuredStatus}
            onChange={(val) => onFiltersChange({ ...filters, featuredStatus: val as any })}
            options={FEATURED_STATUS_OPTIONS}
            className="w-full"
          />
        </div>
      </div>

      {/* Tag Filters Section */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-wrap gap-2">
          {orderedVisibleFilters.map(type => {
            const config = getFilterConfig(type);
            if (!config) return null;
            return (
              <FilterDropdown
                key={type}
                type={type}
                config={config}
                tagCategoryMap={tagCategoryMap}
                filters={filters}
                isLoading={isLoading}
                onAdd={addFilter}
                onRemove={removeFilter}
                isOpen={activeDropdown === type}
                onToggle={() => setActiveDropdown(activeDropdown === type ? null : type)}
                onClose={() => setActiveDropdown(null)}
              />
            );
          })}
        </div>

        {/* Settings Gear */}
        <div className="relative flex-shrink-0" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg bg-dark-900 border border-dark-600 transition-colors",
              customFilterCount > 0 ? "text-cyan-500 border-cyan-500/50" : "text-text-secondary hover:text-cyan-500 hover:border-cyan-500/50"
            )}
            title="Customize Tag Filters"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-lg bg-dark-900 border border-dark-600 shadow-2xl z-50 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">
                Tag Filters
              </h4>
              <div className="space-y-2">
                {filterOrder.map(type => {
                  const config = getFilterConfig(type);
                  if (!config) return null;
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleFilters.includes(type)}
                        onChange={() => toggleFilterVisibility(type)}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-cyan-500 focus:ring-cyan-500 flex-shrink-0"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm text-text-primary">
                          {config.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {customFilterCount > 0 && (
                <button
                  onClick={clearAllTagFilters}
                  className="mt-3 w-full text-xs font-semibold text-cyan-500 hover:text-cyan-400 transition-colors uppercase tracking-wider"
                >
                  Clear All Tag Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Count */}
      {customFilterCount > 0 && (
        <div className="text-xs text-text-muted">
          {customFilterCount} tag filter{customFilterCount !== 1 ? 's' : ''} active
        </div>
      )}
    </div>
  );
}

// Multi-Select Dropdown Component for Tag Filters
function FilterDropdown({
  type,
  config,
  tagCategoryMap,
  filters,
  isLoading,
  onAdd,
  onRemove,
  isOpen,
  onToggle,
  onClose
}: {
  type: FilterType;
  config: { label: string; color: string; customSlug?: string };
  tagCategoryMap: Record<string, TagCategory>;
  filters: AdminVideoFilters;
  isLoading: boolean;
  onAdd: (type: FilterType, value: string) => void;
  onRemove: (type: FilterType, value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const options = config.customSlug ? (tagCategoryMap[config.customSlug]?.tags || []) : [];
  const selectedValues = config.customSlug ? (filters.customTagFilters?.[config.customSlug] || []) : [];

  // Get selected items
  const selectedItems = selectedValues.map(val => {
    const tag = options.find((opt: any) => opt.slug === val);
    return tag ? { 
      label: tag.name, 
      value: tag.slug,
      color: tag.color || config.color
    } : null;
  }).filter(Boolean);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium",
          isLoading
            ? "bg-dark-900/50 border-dark-700 text-text-muted cursor-not-allowed"
            : "bg-dark-900 border-dark-600 text-text-primary hover:border-cyan-500/50"
        )}
      >
        <div 
          className="w-3 h-3 rounded"
          style={{ backgroundColor: config.color }}
        />
        <span>{config.label}</span>
        {selectedItems.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500 text-xs font-bold">
            {selectedItems.length}
          </span>
        )}
        <svg
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Selected Bubbles - Below button */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedItems.map((item: any) => (
            <div
              key={item.value}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 relative group"
              style={{ 
                backgroundColor: `${item.color}20`,
                borderColor: item.color,
                color: item.color
              }}
            >
              <button
                onClick={() => onRemove(type, item.value)}
                className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform"
                style={{ backgroundColor: item.color }}
              >
                ×
              </button>
              <span className="ml-2">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg bg-dark-900 border-2 shadow-2xl"
          style={{ 
            borderColor: config.color,
            overscrollBehavior: 'contain',
          }}
        >
          {options.length > 0 ? (
            <div className="p-2">
              {options.map((option: any) => {
                const value = option.slug;
                const label = option.name;
                const itemColor = option.color || config.color;
                const isSelected = selectedValues.includes(value);

                return (
                  <button
                    key={value}
                    onClick={() => {
                      if (isSelected) {
                        onRemove(type, value);
                      } else {
                        onAdd(type, value);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      isSelected 
                        ? "bg-opacity-20" 
                        : "hover:bg-dark-800"
                    )}
                    style={isSelected ? { backgroundColor: `${itemColor}20` } : {}}
                  >
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: itemColor }}
                    />
                    <span className="text-sm text-text-primary flex-1">{label}</span>
                    {isSelected && (
                      <svg className="w-4 h-4" style={{ color: itemColor }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-text-muted text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
