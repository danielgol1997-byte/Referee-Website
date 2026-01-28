"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface VideoFilters {
  categoryTags: string[];
  restarts: string[];
  criteria: string[];
  sanctions: string[];
  scenarios: string[];
  laws: number[]; // Deprecated: kept for backward compatibility, use customTagFilters['laws'] instead
  customTagFilters?: Record<string, string[]>;
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
  canBeCorrectAnswer: boolean;
  order: number;
  tags: Tag[];
}

interface VideoFilterBarProps {
  filters: VideoFilters;
  onFiltersChange: (filters: VideoFilters) => void;
}

type FilterType = 'category' | 'criteria' | 'restart' | 'sanction' | 'scenario' | `custom:${string}`;

const FILTER_CONFIG: Record<'category' | 'criteria' | 'restart' | 'sanction' | 'scenario', { label: string; color: string; key: keyof VideoFilters }> = {
  category: { label: 'Category', color: '#FF6B6B', key: 'categoryTags' },
  criteria: { label: 'Criteria', color: '#FFD93D', key: 'criteria' },
  restart: { label: 'Restart', color: '#4A90E2', key: 'restarts' },
  sanction: { label: 'Sanction', color: '#EC4899', key: 'sanctions' },
  scenario: { label: 'Scenario', color: '#6BCF7F', key: 'scenarios' },
};

const DEFAULT_FILTER_ORDER: FilterType[] = ['category', 'criteria', 'restart', 'sanction', 'scenario'];
const DEFAULT_VISIBLE_FILTERS: FilterType[] = ['category', 'criteria', 'restart', 'sanction'];
const CUSTOM_FILTER_PREFIX = 'custom:';
const CATEGORY_TAG_CATEGORY_SLUG = 'category';
const CRITERIA_TAG_CATEGORY_SLUG = 'criteria';
const RESTARTS_TAG_CATEGORY_SLUG = 'restarts';
const SANCTION_TAG_CATEGORY_SLUG = 'sanction';
const SCENARIO_TAG_CATEGORY_SLUG = 'scenario';
const GROUP_COLORS: Record<string, string> = {
  laws: '#9B72CB',
  category: '#FF6B6B',
  criteria: '#FFD93D',
  restarts: '#4A90E2',
  sanction: '#EC4899',
  scenario: '#6BCF7F',
};

/**
 * VideoFilterBar - Redesigned Multi-Select Filter Bar
 * 
 * Features:
 * - Multi-select dropdowns with color-coded bubbles
 * - Customizable filter visibility via gear icon
 * - Auto-hides/shows on hover
 * - Criteria requires category selection
 */
export function VideoFilterBar({ filters, onFiltersChange }: VideoFilterBarProps) {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleFilters, setVisibleFilters] = useState<FilterType[]>(DEFAULT_VISIBLE_FILTERS);
  const [filterOrder, setFilterOrder] = useState<FilterType[]>(DEFAULT_FILTER_ORDER);
  const [isClient, setIsClient] = useState(false);

  // Load saved preferences after hydration
  useEffect(() => {
    setIsClient(true);
    const savedVisible = localStorage.getItem('videoFilterPreferences');
    if (savedVisible) {
      try {
        setVisibleFilters(JSON.parse(savedVisible));
      } catch (e) {
        console.error('Failed to load filter preferences');
      }
    }

    const savedOrder = localStorage.getItem('videoFilterOrder');
    if (savedOrder) {
      try {
        setFilterOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to load filter order');
      }
    }
  }, []);
  const [draggedFilter, setDraggedFilter] = useState<FilterType | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

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

  const customCategories = useMemo(
    () => tagCategories.filter(category =>
      ![
        CATEGORY_TAG_CATEGORY_SLUG,
        CRITERIA_TAG_CATEGORY_SLUG,
        RESTARTS_TAG_CATEGORY_SLUG,
        SANCTION_TAG_CATEGORY_SLUG,
        SCENARIO_TAG_CATEGORY_SLUG,
      ].includes(category.slug)
    ),
    [tagCategories]
  );

  const customFilterTypes = useMemo(
    () => customCategories.map(category => `${CUSTOM_FILTER_PREFIX}${category.slug}` as FilterType),
    [customCategories]
  );

  useEffect(() => {
    if (customFilterTypes.length === 0) {
      return;
    }

    // Load saved preferences to check which filters user has explicitly set
    const savedVisible = localStorage.getItem('videoFilterPreferences');
    const savedOrder = localStorage.getItem('videoFilterOrder');
    
    // Add new filters to the order (but not necessarily to visible)
    setFilterOrder(prev => {
      const next = [...prev];
      let changed = false;
      customFilterTypes.forEach(type => {
        if (!next.includes(type)) {
          next.splice(Math.max(next.length - 1, 0), 0, type);
          changed = true;
        }
      });
      // Save the updated order to localStorage so we can track which filters existed
      if (changed) {
        localStorage.setItem('videoFilterOrder', JSON.stringify(next));
      }
      return changed ? next : prev;
    });

    // Only auto-add to visible filters if user hasn't customized their preferences yet
    setVisibleFilters(prev => {
      const next = [...prev];
      
      // If no saved preferences exist, add all custom filters (first-time user experience)
      if (!savedVisible) {
        let changed = false;
        customFilterTypes.forEach(type => {
          if (!next.includes(type)) {
            next.push(type);
            changed = true;
          }
        });
        // Save initial visible filters
        if (changed) {
          localStorage.setItem('videoFilterPreferences', JSON.stringify(next));
        }
        return changed ? next : prev;
      }
      
      // If user has saved preferences, only add truly NEW filters
      // (filters that didn't exist in the order when they last saved)
      if (savedOrder) {
        try {
          const previousOrder: FilterType[] = JSON.parse(savedOrder);
          let changed = false;
          customFilterTypes.forEach(type => {
            // Only add if this filter is NEW (wasn't in previous order) AND not already in visible
            if (!previousOrder.includes(type) && !next.includes(type)) {
              next.push(type);
              changed = true;
            }
          });
          // Save updated visible filters if new ones were added
          if (changed) {
            localStorage.setItem('videoFilterPreferences', JSON.stringify(next));
          }
          return changed ? next : prev;
        } catch (e) {
          console.error('Failed to parse saved filter order');
        }
      }
      
      return prev;
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

  const categoryGroup = tagCategoryMap[CATEGORY_TAG_CATEGORY_SLUG];
  const criteriaGroup = tagCategoryMap[CRITERIA_TAG_CATEGORY_SLUG];
  const restartsGroup = tagCategoryMap[RESTARTS_TAG_CATEGORY_SLUG];
  const sanctionGroup = tagCategoryMap[SANCTION_TAG_CATEGORY_SLUG];
  const scenarioGroup = tagCategoryMap[SCENARIO_TAG_CATEGORY_SLUG];

  // Get filtered criteria based on selected categories
  const filteredCriteriaTags = filters.categoryTags.length > 0 && criteriaGroup?.tags
    ? criteriaGroup.tags.filter(tag => {
        const selectedCategoryNames = filters.categoryTags
          .map(slug => categoryGroup?.tags.find(c => c.slug === slug)?.name)
          .filter(Boolean);
        return tag.parentCategory && selectedCategoryNames.includes(tag.parentCategory);
      })
    : [];

  const isCustomFilter = (type: FilterType): type is `custom:${string}` =>
    type.startsWith(CUSTOM_FILTER_PREFIX);
  const getCustomSlug = (type: FilterType) => type.replace(CUSTOM_FILTER_PREFIX, '');

  const addFilter = (type: FilterType, value: string | number) => {
    if (isCustomFilter(type)) {
      const slug = getCustomSlug(type);
      const currentValues = filters.customTagFilters?.[slug] || [];
      if (!currentValues.includes(value as string)) {
        onFiltersChange({
          ...filters,
          customTagFilters: {
            ...(filters.customTagFilters || {}),
            [slug]: [...currentValues, value as string],
          },
        });
      }
      return;
    }

    // Safety check: skip if filter type no longer exists in config (e.g., deprecated 'law' type)
    const config = FILTER_CONFIG[type as keyof typeof FILTER_CONFIG];
    if (!config) return;

    const key = config.key;
    const currentValues = filters[key] as any[] || [];
    
    if (!currentValues.includes(value)) {
      const newFilters = { ...filters, [key]: [...currentValues, value] };
      
      // Clear criteria when no categories selected
      if (type === 'category' && newFilters.categoryTags.length === 0) {
        newFilters.criteria = [];
      }
      
      onFiltersChange(newFilters);
    }
  };

  const removeFilter = (type: FilterType, value: string | number) => {
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
      return;
    }

    // Safety check: skip if filter type no longer exists in config (e.g., deprecated 'law' type)
    const config = FILTER_CONFIG[type as keyof typeof FILTER_CONFIG];
    if (!config) return;

    const key = config.key;
    const currentValues = filters[key] as any[] || [];
    const newFilters = { 
      ...filters, 
      [key]: currentValues.filter((v: any) => v !== value)
    };
    
    // Clear criteria when last category is removed
    if (type === 'category' && newFilters.categoryTags.length === 0) {
      newFilters.criteria = [];
    }
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categoryTags: [],
      restarts: [],
      criteria: [],
      sanctions: [],
      scenarios: [],
      laws: [], // Deprecated but kept for backward compatibility
      customTagFilters: {},
    });
  };

  const toggleFilterVisibility = (type: FilterType) => {
    let newVisible: FilterType[];
    
    if (visibleFilters.includes(type)) {
      // Don't allow removing category if criteria is visible
      if (type === 'category' && visibleFilters.includes('criteria')) {
        return;
      }
      newVisible = visibleFilters.filter(f => f !== type);
    } else {
      // When adding criteria, also add category
      if (type === 'criteria' && !visibleFilters.includes('category')) {
        newVisible = [...visibleFilters, 'category', type];
      } else {
        newVisible = [...visibleFilters, type];
      }
    }
    
    setVisibleFilters(newVisible);
    localStorage.setItem('videoFilterPreferences', JSON.stringify(newVisible));
  };

  const handleDragStart = (type: FilterType) => {
    setDraggedFilter(type);
  };

  const handleDragOver = (e: React.DragEvent, type: FilterType) => {
    e.preventDefault();
    if (draggedFilter && draggedFilter !== type) {
      const newOrder = [...filterOrder];
      const draggedIndex = newOrder.indexOf(draggedFilter);
      const targetIndex = newOrder.indexOf(type);
      
      // Remove from old position
      newOrder.splice(draggedIndex, 1);
      // Insert at new position
      newOrder.splice(targetIndex, 0, draggedFilter);
      
      setFilterOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedFilter(null);
    localStorage.setItem('videoFilterOrder', JSON.stringify(filterOrder));
  };

  // Get visible filters in the saved order
  const orderedVisibleFilters = filterOrder.filter(f => visibleFilters.includes(f));

  const customFilterCount = Object.values(filters.customTagFilters || {}).reduce(
    (count, values) => count + values.length,
    0
  );

  const activeFilterCount = 
    filters.categoryTags.length +
    filters.restarts.length +
    filters.criteria.length +
    filters.sanctions.length +
    filters.scenarios.length +
    customFilterCount;

  const getFilterConfig = (type: FilterType) => {
    if (isCustomFilter(type)) {
      const slug = getCustomSlug(type);
      const category = tagCategoryMap[slug];
      return {
        label: category?.name || slug,
        color: GROUP_COLORS[slug] || '#00E8F8',
        key: 'customTagFilters' as const,
        customSlug: slug,
      };
    }
    // Return the config if it exists, otherwise return null for deprecated types
    return FILTER_CONFIG[type as keyof typeof FILTER_CONFIG] || null;
  };

  return (
    <div 
      ref={filterBarRef}
      className="relative"
    >
      {/* Filter Bar Content - Always Visible */}
      <div
        className="border-b border-amber-400/30 bg-gradient-to-b from-amber-500/20 to-amber-600/10 backdrop-blur-md shadow-lg shadow-amber-500/10"
      >
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          {/* Filter Controls */}
          <div className="flex items-start gap-3 flex-wrap">
            {orderedVisibleFilters.map(type => {
              const config = getFilterConfig(type);
              if (!config) return null; // Skip invalid filter types
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
                  filteredCriteriaTags={filteredCriteriaTags}
                  isOpen={activeDropdown === type}
                  onToggle={() => setActiveDropdown(activeDropdown === type ? null : type)}
                  onClose={() => setActiveDropdown(null)}
                />
              );
            })}

            {/* Settings Gear */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-2 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-secondary hover:text-accent hover:border-accent transition-colors self-start"
                title="Customize Filters"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <div className="absolute top-full right-0 mt-2 w-64 rounded-lg bg-dark-900 border border-dark-600 shadow-2xl z-50 p-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-3">
                    Customize Filters
                  </h4>
                  <div className="space-y-2">
                    {filterOrder.map(type => {
                      const config = getFilterConfig(type);
                      if (!config) return null; // Skip invalid filter types
                      return (
                      <div
                        key={type}
                        draggable
                        onDragStart={() => handleDragStart(type)}
                        onDragOver={(e) => handleDragOver(e, type)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg transition-colors",
                          (type === 'category' && visibleFilters.includes('criteria')) && "opacity-50 cursor-not-allowed",
                          draggedFilter === type ? "opacity-50" : "hover:bg-dark-800 cursor-move"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={visibleFilters.includes(type)}
                          onChange={() => toggleFilterVisibility(type)}
                          disabled={type === 'category' && visibleFilters.includes('criteria')}
                          className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-accent focus:ring-accent flex-shrink-0"
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
                        
                        {/* Drag Handle */}
                        <svg className="w-4 h-4 text-text-muted flex-shrink-0 cursor-grab active:cursor-grabbing hover:text-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16" />
                        </svg>
                      </div>
                    );
                    })}
                  </div>
                  <p className="text-xs text-text-muted mt-3 italic">
                    * Can't remove Category while Criteria is visible
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </div>
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors uppercase tracking-wider"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Multi-Select Dropdown Component
function FilterDropdown({
  type,
  config,
  tagCategoryMap,
  filters,
  isLoading,
  onAdd,
  onRemove,
  filteredCriteriaTags,
  isOpen,
  onToggle,
  onClose
}: {
  type: FilterType;
  config: { label: string; color: string; key: keyof VideoFilters; customSlug?: string };
  tagCategoryMap: Record<string, TagCategory>;
  filters: VideoFilters;
  isLoading: boolean;
  onAdd: (type: FilterType, value: string | number) => void;
  onRemove: (type: FilterType, value: string | number) => void;
  filteredCriteriaTags: Tag[];
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

  // Get options based on filter type
  const getOptions = (): any[] => {
    if (type === 'criteria') return filteredCriteriaTags;
    if (type === 'category') return tagCategoryMap[CATEGORY_TAG_CATEGORY_SLUG]?.tags || [];
    if (type === 'restart') return tagCategoryMap[RESTARTS_TAG_CATEGORY_SLUG]?.tags || [];
    if (type === 'sanction') return tagCategoryMap[SANCTION_TAG_CATEGORY_SLUG]?.tags || [];
    if (type === 'scenario') return tagCategoryMap[SCENARIO_TAG_CATEGORY_SLUG]?.tags || [];
    if (config.customSlug) return tagCategoryMap[config.customSlug]?.tags || [];
    return [];
  };

  const options = getOptions();
  const selectedValues =
    config.key === 'customTagFilters' && config.customSlug
      ? (filters.customTagFilters?.[config.customSlug] || [])
      : (filters[config.key] as any[] || []);
  const isDisabled = type === 'criteria' && filters.categoryTags.length === 0;

  // Get selected items
  const selectedItems = selectedValues.map(val => {
    const tag = options.find((opt: any) => opt.slug === val || opt.value === val);
    return tag ? { 
      label: tag.label || tag.name, 
      value: tag.value || tag.slug,
      color: (tag as Tag).color || config.color
    } : null;
  }).filter(Boolean);

  return (
    <div className="flex-1 min-w-[200px]" ref={dropdownRef}>
      <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
        {config.label}
      </label>
      
      {/* Dropdown Button */}
      <button
        onClick={() => !isDisabled && onToggle()}
        disabled={isDisabled || isLoading}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm transition-all",
          isDisabled
            ? "bg-dark-900/50 border-dark-700 text-text-muted cursor-not-allowed"
            : "bg-dark-900 text-text-primary hover:border-opacity-100 cursor-pointer",
          !isDisabled && "focus:outline-none focus:ring-2 focus:ring-opacity-50"
        )}
        style={{ 
          borderColor: isDisabled ? '#374151' : `${config.color}60`,
          ...(isOpen && !isDisabled && { borderColor: config.color })
        }}
      >
        <span className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded"
            style={{ backgroundColor: config.color }}
          />
          {isDisabled ? 'Select Category First' : selectedItems.length > 0 ? `${selectedItems.length} selected` : `Select ${config.label}...`}
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
      {isOpen && !isDisabled && (
        <div className="absolute z-50 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg bg-dark-900 border-2 shadow-2xl"
             style={{ 
               borderColor: config.color,
               overscrollBehavior: 'contain',
               touchAction: 'pan-y',
               WebkitOverflowScrolling: 'touch',
             }}>
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
