"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useModal } from "@/components/ui/modal";

interface TagCategory {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  rapCategory?: string | null;
  color?: string;
}

interface RAPCategoryMapperProps {
  onRefresh: () => void;
}

// RAP Category definitions with their codes
const RAP_CATEGORIES = [
  { 
    code: 'A', 
    name: 'Decision Making',
    color: '#FF6B6B',
    description: 'Technical decisions on fouls, misconduct, and penalty areas'
  },
  { 
    code: 'B', 
    name: 'Management',
    color: '#4A90E2',
    description: 'Game management, advantage, and simulation'
  },
  { 
    code: 'C', 
    name: 'Offside',
    color: '#1BC47D',
    description: 'Offside positioning and decisions'
  },
  { 
    code: 'D', 
    name: 'Teamwork',
    color: '#9B72CB',
    description: 'Communication and cooperation between officials'
  },
  { 
    code: 'L', 
    name: 'Laws of the Game',
    color: '#FFD93D',
    description: 'Knowledge and application of the Laws'
  },
];

const CATEGORY_TAG_CATEGORY_SLUG = 'category';
const CRITERIA_TAG_CATEGORY_SLUG = 'criteria';

/**
 * RAPCategoryMapper - Map CATEGORY tags to RAP categories
 * 
 * This creates the relationship between decision types (Challenges, Handball, etc.)
 * and UEFA RAP categories (Decision Making, Management, Offside, Teamwork, Laws)
 */
export function RAPCategoryMapper({ onRefresh }: RAPCategoryMapperProps) {
  const modal = useModal();
  const [categoryTags, setCategoryTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [criteriaCounts, setCriteriaCounts] = useState<Record<string, number>>({});

  // Fetch CATEGORY tags
  useEffect(() => {
    fetchCategoryTags();
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    try {
      const response = await fetch('/api/admin/library/tags');
      if (response.ok) {
        const data = await response.json();
        const allTags = data.tags || [];
        
        // Group criteria by RAP category for display
        const criteriaByRAP: Record<string, number> = {};
        allTags
          .filter((t: Tag) => t.category?.slug === CRITERIA_TAG_CATEGORY_SLUG && t.rapCategory)
          .forEach((tag: Tag) => {
            if (tag.rapCategory) {
              criteriaByRAP[tag.rapCategory] = (criteriaByRAP[tag.rapCategory] || 0) + 1;
            }
          });
        
        setCriteriaCounts(criteriaByRAP);
      }
    } catch (error) {
      console.error('Failed to fetch all tags:', error);
    }
  };

  const fetchCategoryTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/library/tags');
      if (response.ok) {
        const data = await response.json();
        const tags = data.tags || [];
        const categories = tags.filter((t: Tag) => t.category?.slug === CATEGORY_TAG_CATEGORY_SLUG);
        setCategoryTags(categories);
        
        // Initialize mappings
        const initialMappings: Record<string, string> = {};
        categories.forEach((tag: Tag) => {
          if (tag.rapCategory) {
            initialMappings[tag.id] = tag.rapCategory;
          }
        });
        setMappings(initialMappings);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = async (tagId: string, rapCode: string) => {
    // Update local state immediately for responsive UI
    setMappings(prev => ({
      ...prev,
      [tagId]: rapCode === '' ? '' : rapCode
    }));

    // Auto-save to backend
    try {
      const rapCategory = rapCode === '' ? null : rapCode;
      
      const response = await fetch(`/api/admin/library/tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rapCategory }),
      });

      if (response.ok) {
        // Also update all criteria that belong to this category
        const categoryTag = categoryTags.find(t => t.id === tagId);
        if (categoryTag) {
          await updateChildCriteria(categoryTag.name, rapCategory);
        }
        
        // Refresh to show updated data
        await fetchAllTags();
        onRefresh();
      } else {
        const error = await response.json();
        await modal.showError(`Failed to save: ${error.error || 'Unknown error'}`);
        // Revert on error
        fetchCategoryTags();
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      await modal.showError('Failed to save RAP category mapping');
      // Revert on error
      fetchCategoryTags();
    }
  };

  // Update all criteria tags that have this category as parent
  const updateChildCriteria = async (categoryName: string, rapCategory: string | null) => {
    try {
      const response = await fetch('/api/admin/library/tags/bulk-update-rap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parentCategory: categoryName,
          rapCategory 
        }),
      });

      if (!response.ok) {
        console.error('Failed to update child criteria');
      }
    } catch (error) {
      console.error('Error updating child criteria:', error);
    }
  };

  const getRAPCategoryInfo = (code: string | undefined) => {
    return RAP_CATEGORIES.find(c => c.code === code);
  };

  // Group tags by their RAP category for display
  const groupedByRAP: Record<string, Tag[]> = {};
  const unmappedTags: Tag[] = [];

  categoryTags.forEach(tag => {
    const rapCode = mappings[tag.id] || tag.rapCategory;
    if (rapCode) {
      if (!groupedByRAP[rapCode]) {
        groupedByRAP[rapCode] = [];
      }
      groupedByRAP[rapCode].push(tag);
    } else {
      unmappedTags.push(tag);
    }
  });

  if (loading) {
    return (
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-text-secondary">Loading category mappings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-xl font-bold text-white mb-2">RAP Category Mappings</h3>
        <p className="text-text-secondary text-sm">
          Map decision types (Challenges, Handball, etc.) to UEFA RAP categories. This helps organize videos and criteria by assessment area.
        </p>
      </div>

      {/* RAP Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {RAP_CATEGORIES.map(rap => {
          const assignedTags = groupedByRAP[rap.code] || [];
          const criteriaCount = criteriaCounts[rap.code] || 0;
          
          return (
            <div
              key={rap.code}
              className="rounded-xl border-2 p-4"
              style={{ 
                borderColor: rap.color + '40',
                backgroundColor: rap.color + '10'
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: rap.color, color: '#000' }}
                >
                  {rap.code}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{rap.name}</h4>
                  <p className="text-xs text-text-muted">{rap.description}</p>
                  {criteriaCount > 0 && (
                    <p className="text-xs text-cyan-400 mt-1">
                      {criteriaCount} criteria tag{criteriaCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm text-text-secondary">
                {assignedTags.length === 0 ? (
                  <span className="text-text-muted italic">No categories mapped</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {assignedTags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: tag.color || rap.color,
                          color: '#000'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapping Table */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 overflow-hidden">
        <div className="p-4 border-b border-dark-600 bg-dark-900/50">
          <h4 className="font-semibold text-white">Assign RAP Categories</h4>
          <p className="text-sm text-text-muted mt-1">
            Select the appropriate RAP category for each decision type
          </p>
        </div>

        <div className="divide-y divide-dark-600">
          {categoryTags.map(tag => {
            const currentMapping = mappings[tag.id] || tag.rapCategory || '';
            const rapInfo = getRAPCategoryInfo(currentMapping);

            return (
              <div
                key={tag.id}
                className="p-4 hover:bg-dark-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Tag Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#00E8F8' }}
                      />
                      <span className="font-medium text-white">{tag.name}</span>
                    </div>
                  </div>

                  {/* Current RAP Category */}
                  <div className="flex-1">
                    {rapInfo ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: rapInfo.color, color: '#000' }}
                        >
                          {rapInfo.code}
                        </div>
                        <span className="text-sm text-text-secondary">{rapInfo.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted italic">Not mapped</span>
                    )}
                  </div>

                  {/* RAP Category Selector */}
                  <div className="flex-1 max-w-xs">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(tag.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary text-sm focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                    >
                      <option value="">None</option>
                      {RAP_CATEGORIES.map(rap => (
                        <option key={rap.code} value={rap.code}>
                          {rap.code} - {rap.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmapped Categories Warning */}
      {unmappedTags.length > 0 && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h5 className="font-semibold text-yellow-500 mb-1">Unmapped Categories</h5>
              <p className="text-sm text-text-secondary mb-2">
                The following categories haven't been assigned to a RAP category:
              </p>
              <div className="flex flex-wrap gap-2">
                {unmappedTags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 rounded text-xs font-medium bg-dark-700 text-text-secondary"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
