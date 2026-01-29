"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useModal } from "@/components/ui/modal";

interface TagCategory {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  canBeCorrectAnswer: boolean;
  allowLinks: boolean;
  order: number;
  isActive?: boolean;
  description?: string | null;
  _count?: { tags: number };
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  categoryId?: string;
  parentCategory?: string | null;
  color?: string;
  linkUrl?: string | null;
  description?: string;
  isActive: boolean;
  order: number;
  _count?: { videos: number };
}

interface DecisionType {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  order: number;
  isActive: boolean;
}

interface TagManagerProps {
  tags: Tag[];
  tagCategories: TagCategory[];
  onRefresh: () => void;
}

// Category colors for criteria tags
const CATEGORY_COLORS: Record<string, string> = {
  'Challenges': '#FF6B6B',
  'DOGSO': '#FF4D6D',
  'SPA': '#FFB347',
  'Handball': '#4ECDC4',
  'Offside': '#1BC47D',
};

// Map criteria tags to their parent categories
const CRITERIA_TO_CATEGORY: Record<string, string> = {
  'Careless': 'Challenges',
  'Reckless': 'Challenges',
  'Serious Foul Play': 'Challenges',
  'Violent Conduct': 'Challenges',
  'Excessive Force': 'Challenges',
  'Endangering Safety Of Opponent': 'Challenges',
  'Hand/Arm Moves Towards The Ball': 'Handball',
  'Hand/Arm Supports Body But Not Extended': 'Handball',
  'Hand/Arm Not Extended': 'Handball',
  'Ball Movement Towards Hand/Arm': 'Handball',
  'Ball Coming From Short Distance': 'Handball',
  'Unexpected Ball': 'Handball',
  'Distance Not Short / Ball Not Unexpected': 'Handball',
  'Player Tries To Avoid Hand Contact': 'Handball',
  'Player Does Not Try To Avoid Hand Contact': 'Handball',
  'Player Unable To Avoid Hand Contact': 'Handball',
  'Attacker Gains Possession After Touching With Hand/Arm': 'Handball',
  'Interfering With Play': 'Offside',
  'Interfering With An Opponent': 'Offside',
  'Gaining An Advantage': 'Offside',
  'Not Interfering With Play': 'Offside',
  'Not Interfering With An Opponent': 'Offside',
  'Challenging Opponent For The Ball': 'Offside',
  'Not Challenging Opponent For The Ball': 'Offside',
  'Making Obvious Action': 'Offside',
  'Not Making Obvious Action': 'Offside',
  'Clear Impact On Ability Of Opponent To Play The Ball': 'Offside',
  'No Clear Impact On Opponent': 'Offside',
  'Clearly Obstructing Opponent\'s Line Of Vision': 'Offside',
  'Not Clearly Obstructing Opponent\'s Line Of Vision': 'Offside',
  'Ball Deliberately Saved By Opponent': 'Offside',
  'Ball Rebounds/Deflects Off Opponent': 'Offside',
  'Ball Rebounds/Deflects Off Crossbar': 'Offside',
  'Touching/Playing Ball Passed By Teammate': 'Offside',
  'DOGSO While Attempting To Play The Ball': 'DOGSO',
  'DOGSO Whilst Not Attempting To Play The Ball': 'DOGSO',
  'Denying A Goal Or Obvious Goal-Scoring Opportunity': 'DOGSO',
  'Promising Attack Stopped While Attempting To Play The Ball': 'SPA',
  'Stopping A Promising Attack While Not Attempting To Play The Ball': 'SPA',
  'No Promising Attack Stopped': 'SPA',
  'No Reckless Challenge': 'SPA',
  'No Serious Foul Play': 'SPA',
};

const CATEGORY_TAG_CATEGORY_SLUG = 'category';
const CRITERIA_TAG_CATEGORY_SLUG = 'criteria';
const SANCTION_TAG_CATEGORY_SLUG = 'sanction';

// Map known tag category slugs to their colors
const GROUP_COLORS: Record<string, string> = {
  laws: '#9B72CB',     // Purple - Laws of the Game
  category: '#FF6B6B',
  restarts: '#4A90E2',
  criteria: '#FFD93D',
  sanction: '#EC4899', // Pink/Magenta - distinct and vibrant
  scenario: '#6BCF7F',
};

// Preset colors for each category
const PRESET_COLORS: Record<string, string[]> = {
  // Rainbow palette for categories
  category: [
    '#FF6B6B', // Red
    '#FF8C42', // Orange
    '#FFD93D', // Yellow
    '#6BCF7F', // Green
    '#4ECDC4', // Teal
    '#45B7D1', // Light Blue
    '#5F9DF7', // Blue
    '#9B72CB', // Purple
    '#C77DFF', // Light Purple
    '#E0ACD5', // Pink
    '#FF6B9D', // Hot Pink
    '#F72585', // Magenta
    '#7209B7', // Deep Purple
    '#560BAD', // Dark Purple
  ],
  restarts: ['#00A5E8', '#4A90E2', '#5C6AC4', '#667EEA', '#764BA2'],
  // Criteria usually inherit, but provide the palette just in case
  criteria: [
    '#FF6B6B', '#FF8C42', '#FFD93D', '#6BCF7F', '#4ECDC4', 
    '#45B7D1', '#5F9DF7', '#9B72CB', '#F72585'
  ],
  sanction: ['#F5B400', '#FF4D6D', '#1BC47D', '#95E1D3'],
  scenario: ['#A8E6CF', '#FFDAC1', '#B5EAD7', '#C7CEEA', '#FFB6B9'],
};

// Define the rainbow order for categories
const CATEGORY_ORDER = [
  'Challenges', 'DOGSO', 'SPA', 'Handball', 'Holding', 
  'Illegal Use Of Arms', 'Penalty Area Decisions', 'Simulation',
  'Advantage', 'Dissent', 'Referee Abuse', 'Offside', 
  'Teamwork', 'Laws Of The Game'
];

export function TagManager({ tags, tagCategories: initialTagCategories, onRefresh }: TagManagerProps) {
  const modal = useModal();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>(initialTagCategories);
  const [isCreatingTagCategory, setIsCreatingTagCategory] = useState(false);
  const [editingTagCategory, setEditingTagCategory] = useState<TagCategory | null>(null);
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [isSavingTagCategory, setIsSavingTagCategory] = useState(false);
  // Rainbow color palette for tag categories
  const TAG_CATEGORY_RAINBOW_COLORS = [
    '#FF6B6B', // Red
    '#FF8C42', // Orange
    '#FFD93D', // Yellow
    '#6BCF7F', // Green
    '#4ECDC4', // Teal
    '#45B7D1', // Light Blue
    '#5F9DF7', // Blue
    '#9B72CB', // Purple
    '#C77DFF', // Light Purple
    '#E0ACD5', // Pink
    '#FF6B9D', // Hot Pink
    '#F72585', // Magenta
  ];

  // Get next available color from rainbow palette
  const getNextRainbowColor = () => {
    const usedColors = tagCategories.map(cat => cat.color).filter(Boolean);
    const unusedColor = TAG_CATEGORY_RAINBOW_COLORS.find(color => !usedColors.includes(color));
    return unusedColor || TAG_CATEGORY_RAINBOW_COLORS[tagCategories.length % TAG_CATEGORY_RAINBOW_COLORS.length];
  };

  const [tagCategoryFormData, setTagCategoryFormData] = useState({
    name: '',
    description: '',
    color: '#00E8F8',
    canBeCorrectAnswer: false,
    allowLinks: false,
    order: 0,
    isActive: true,
  });
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({});
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    parentCategory: '',
    color: '#00E8F8',
    linkUrl: '',
    description: '',
    isActive: true,
  });
  const [customColor, setCustomColor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-expand tabs when searching
  useEffect(() => {
    if (searchQuery) {
      const expanded: Record<string, boolean> = {};
      tagCategories.forEach(category => {
        expanded[category.id] = true;
      });
      setExpandedTabs(expanded);
      // Also expand sub-categories for CRITERIA
      const allSubCategories: Record<string, boolean> = {};
      filteredTags.forEach(tag => {
        if (tag.category?.slug === CRITERIA_TAG_CATEGORY_SLUG && tag.parentCategory) {
          allSubCategories[tag.parentCategory] = true;
        }
      });
      if (Object.keys(allSubCategories).length > 0) {
        setExpandedSubCategories(prev => ({ ...prev, ...allSubCategories }));
      }
    }
  }, [searchQuery, tags.length, tagCategories]);

  // Sync tagCategories when props change
  useEffect(() => {
    setTagCategories(initialTagCategories);
  }, [initialTagCategories]);

  const fetchTagCategories = async () => {
    try {
      const response = await fetch('/api/admin/library/tag-categories');
      if (!response.ok) {
        console.error('Failed to fetch tag categories');
        return;
      }
      const data = await response.json();
      setTagCategories(data.tagCategories || []);
    } catch (error) {
      console.error('Failed to fetch tag categories:', error);
    }
  };

  useEffect(() => {
    if (tagCategories.length === 0) {
      return;
    }

    if (Object.keys(expandedTabs).length === 0) {
      const initialExpanded: Record<string, boolean> = {};
      tagCategories.forEach(category => {
        initialExpanded[category.id] = false;
      });
      setExpandedTabs(initialExpanded);
    }

    if (!formData.categoryId) {
      const defaultCategory =
        tagCategories.find(category => category.slug === CATEGORY_TAG_CATEGORY_SLUG) ||
        tagCategories[0];
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, categoryId: defaultCategory.id }));
      }
    }
  }, [tagCategories, expandedTabs, formData.categoryId]);

  const selectedTagCategory = tagCategories.find(category => category.id === formData.categoryId);
  const selectedTagCategorySlug = selectedTagCategory?.slug;

  // Get category tags (these serve as categories for criteria)
  const categoryTags = tags.filter(t => t.category?.slug === CATEGORY_TAG_CATEGORY_SLUG && t.isActive);

  // Pre-sort category tags for the dropdown
  const sortedDropdownTags = [...categoryTags].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.name);
    const indexB = CATEGORY_ORDER.indexOf(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Click outside handler for category dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update color to group color when category changes (for new tags)
  // SANCTION tags always use the same color
  useEffect(() => {
    if (isCreating && !editingTag) {
      const groupColor = (selectedTagCategory?.color) || (selectedTagCategorySlug && GROUP_COLORS[selectedTagCategorySlug]) || '#00E8F8';
      setFormData(prev => ({ ...prev, color: groupColor }));
    }
    // Also enforce SANCTION color when editing
    if (
      selectedTagCategorySlug === SANCTION_TAG_CATEGORY_SLUG &&
      formData.color !== (selectedTagCategory?.color || GROUP_COLORS[SANCTION_TAG_CATEGORY_SLUG])
    ) {
      setFormData(prev => ({ ...prev, color: selectedTagCategory?.color || GROUP_COLORS[SANCTION_TAG_CATEGORY_SLUG] }));
    }
  }, [selectedTagCategorySlug, selectedTagCategory?.color, isCreating, editingTag, formData.color]);

  useEffect(() => {
    if (selectedTagCategory && !selectedTagCategory.allowLinks && formData.linkUrl) {
      setFormData(prev => ({ ...prev, linkUrl: '' }));
    }
  }, [selectedTagCategory, formData.linkUrl]);

  const toggleTab = (category: string) => {
    setExpandedTabs(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleSubCategory = (subCategory: string) => {
    setExpandedSubCategories(prev => ({ ...prev, [subCategory]: !prev[subCategory] }));
  };

  const handleGroupSelect = (categoryId: string) => {
    const selectedCategory = tagCategories.find(category => category.id === categoryId);
    const categorySlug = selectedCategory?.slug;
    const groupColor = selectedCategory?.color || (categorySlug && GROUP_COLORS[categorySlug]) || '#00E8F8';
    setFormData(prev => ({
      ...prev,
      categoryId,
      parentCategory: '',
      color: groupColor // Set to group's unique color
    }));
    setIsGroupDropdownOpen(false);
  };

  const handleCategorySelect = (categoryName: string) => {
    const selectedCat = categoryTags.find(c => c.name === categoryName);
    setFormData(prev => ({
      ...prev,
      parentCategory: categoryName,
      color: selectedCat?.color || prev.color // Inherit color
    }));
    setIsCategoryDropdownOpen(false);
  };

  const resetForm = () => {
    const defaultCategory =
      tagCategories.find(category => category.slug === CATEGORY_TAG_CATEGORY_SLUG) ||
      tagCategories[0];
    setFormData({
      name: '',
      categoryId: defaultCategory?.id || '',
      parentCategory: '',
      color: '#00E8F8',
      linkUrl: '',
      description: '',
      isActive: true,
    });
    setCustomColor('');
    setIsCreating(false);
    setEditingTag(null);
  };

  const resetTagCategoryForm = () => {
    setTagCategoryFormData({
      name: '',
      description: '',
      color: getNextRainbowColor(),
      canBeCorrectAnswer: false,
      allowLinks: false,
      order: 0,
      isActive: true,
    });
    setIsCreatingTagCategory(false);
    setEditingTagCategory(null);
  };

  const handleTagCategoryEdit = (category: TagCategory) => {
    setEditingTagCategory(category);
    setTagCategoryFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#00E8F8',
      canBeCorrectAnswer: category.canBeCorrectAnswer,
      allowLinks: category.allowLinks,
      order: category.order || 0,
      isActive: category.isActive !== undefined ? category.isActive : true,
    });
    setIsCreatingTagCategory(true);
  };

  const handleTagCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTagCategory(true);
      const url = editingTagCategory
        ? `/api/admin/library/tag-categories/${editingTagCategory.id}`
        : '/api/admin/library/tag-categories';

      const response = await fetch(url, {
        method: editingTagCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagCategoryFormData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save tag category');
      }

      await modal.showSuccess(
        editingTagCategory ? 'Tag category updated successfully!' : 'Tag category created successfully!'
      );
      resetTagCategoryForm();
      await fetchTagCategories();
      onRefresh();
    } catch (error: any) {
      console.error('Tag category save error:', error);
      await modal.showError(error.message || 'Failed to save tag category');
    } finally {
      setIsSavingTagCategory(false);
    }
  };

  const handleTagCategoryDelete = async (category: TagCategory) => {
    const tagCount = category._count?.tags || 0;
    
    let confirmed;
    if (tagCount > 0) {
      confirmed = await modal.showConfirm(
        `This tag category "${category.name}" has ${tagCount} tag(s). You must move or delete the tags first.\n\nAre you sure you want to continue?`,
        'Delete Tag Category',
        'warning'
      );
    } else {
      confirmed = await modal.showConfirm(
        `Are you sure you want to delete the tag category "${category.name}"?`,
        'Delete Tag Category',
        'warning'
      );
    }

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/library/tag-categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete tag category');
      }

      await modal.showSuccess('Tag category deleted successfully!');
      await fetchTagCategories();
      onRefresh();
    } catch (error: any) {
      console.error('Tag category delete error:', error);
      await modal.showError(error.message || 'Failed to delete tag category');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    // SANCTION tags always use the same color
    const tagCategorySlug = tag.category?.slug;
    const tagColor =
      tagCategorySlug === SANCTION_TAG_CATEGORY_SLUG
        ? (tag.category?.color || GROUP_COLORS[SANCTION_TAG_CATEGORY_SLUG])
        : (tag.color || '#00E8F8');
    setFormData({
      name: tag.name,
      categoryId: tag.category?.id || '',
      parentCategory: tag.parentCategory || '',
      color: tagColor,
      linkUrl: tag.linkUrl || '',
      description: tag.description || '',
      isActive: tag.isActive,
    });
    setCustomColor('');
    setIsCreating(true);
    
    // Scroll to form section
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSavingTag(true);
      const url = editingTag
        ? `/api/admin/library/tags/${editingTag.id}`
        : '/api/admin/library/tags';
      
      const submitData = {
        ...formData,
        parentCategory:
          selectedTagCategorySlug === CRITERIA_TAG_CATEGORY_SLUG && formData.parentCategory
            ? formData.parentCategory
            : null,
        linkUrl: selectedTagCategory?.allowLinks ? (formData.linkUrl || null) : null,
        // SANCTION tags always use the same color
        color:
          selectedTagCategorySlug === SANCTION_TAG_CATEGORY_SLUG
            ? (selectedTagCategory?.color || GROUP_COLORS[SANCTION_TAG_CATEGORY_SLUG])
            : formData.color,
      };
      
      const response = await fetch(url, {
        method: editingTag ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || 'Failed to save tag';
        // Provide more helpful error message for slug conflicts
        if (errorMessage.includes('slug') && errorMessage.includes('already exists')) {
          throw new Error(`A tag with a similar name already exists. The system will automatically generate a unique identifier. Please try again, or use a more unique name.`);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      await modal.showSuccess(editingTag ? 'Tag updated successfully!' : 'Tag created successfully!');
      resetForm();
      onRefresh();
    } catch (error: any) {
      console.error('Save error:', error);
      await modal.showError(error.message || 'Failed to save tag');
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleDelete = async (tagId: string, tagName: string, videoCount: number) => {
    let confirmed;
    if (videoCount > 0) {
      confirmed = await modal.showConfirm(
        `This tag is used by ${videoCount} video(s).\n\nAre you sure you want to delete "${tagName}"?`,
        'Delete Tag',
        'warning'
      );
    } else {
      confirmed = await modal.showConfirm(
        `Are you sure you want to delete "${tagName}"?`,
        'Delete Tag',
        'warning'
      );
    }

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/library/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      await modal.showSuccess('Tag deleted successfully!');
      onRefresh();
    } catch (error: any) {
      console.error('Delete error:', error);
      await modal.showError(error.message || 'Failed to delete tag');
    }
  };

  // Group tags by category
  const groupedTags = filteredTags.reduce((acc, tag) => {
    const categoryId = tag.category?.id || 'uncategorized';
    if (!acc[categoryId]) acc[categoryId] = [];
    acc[categoryId].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Debug: Log tags
  console.log('TagManager: Received', tags.length, 'tags');
  if (tags.length > 0) {
    console.log('TagManager: Categories:', Object.keys(groupedTags));
    console.log('TagManager: Sample tag:', tags[0]);
  }

  // Sort tags within each category by order
  Object.keys(groupedTags).forEach(category => {
    groupedTags[category].sort((a, b) => a.order - b.order);
  });


  const criteriaTagCategory = tagCategories.find(category => category.slug === CRITERIA_TAG_CATEGORY_SLUG);
  const criteriaCategoryId = criteriaTagCategory?.id;

  // Group criteria tags by their category (parentCategory references CATEGORY tags)
  const criteriaByCategory: Record<string, Tag[]> = {};
  const generalCriteria: Tag[] = [];
  
  // Initialize with ALL category tags (even if they have 0 criteria)
  categoryTags.forEach(cat => {
    criteriaByCategory[cat.name] = [];
  });
  
  // Then populate with actual criteria
  if (criteriaCategoryId && groupedTags[criteriaCategoryId]) {
    groupedTags[criteriaCategoryId].forEach(tag => {
      if (tag.parentCategory && criteriaByCategory[tag.parentCategory]) {
        criteriaByCategory[tag.parentCategory].push(tag);
      } else {
        generalCriteria.push(tag);
      }
    });
  }

  // Map category tags to their colors
  const categoryColors: Record<string, string> = {};
  const categoryTagsMap: Record<string, Tag> = {};
  categoryTags.forEach(cat => {
    categoryColors[cat.name] = cat.color || '#00E8F8';
    categoryTagsMap[cat.name] = cat;
  });

  // Get sorted category entries in rainbow order (includes empty groups)
  const sortedCategoryEntries = Object.entries(criteriaByCategory).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a[0]);
    const indexB = CATEGORY_ORDER.indexOf(b[0]);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const renderTagItem = (tag: Tag) => (
    <div
      key={tag.id}
      className="flex items-center justify-between p-3 rounded-lg bg-dark-900/50 border border-dark-600 hover:border-cyan-500/50 transition-all"
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          className="w-8 h-8 rounded-lg border-2"
          style={{ backgroundColor: tag.color, borderColor: tag.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{tag.name}</span>
            {!tag.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
            <span>{tag.slug}</span>
            {tag._count && (
              <span>• {tag._count.videos} video{tag._count.videos !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleEdit(tag)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(tag.id, tag.name, tag._count?.videos || 0)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search tags by name, slug, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-text-muted"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tag Category Management */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Tag Categories</h3>
            <p className="text-sm text-text-muted mt-1">
              Tag categories control whether tags are filter-only or can also be used as correct answers.
            </p>
          </div>
          {!isCreatingTagCategory && (
            <button
              onClick={() => {
                setTagCategoryFormData({
                  name: '',
                  description: '',
                  color: getNextRainbowColor(),
                  canBeCorrectAnswer: false,
                  allowLinks: false,
                  order: 0,
                  isActive: true,
                });
                setIsCreatingTagCategory(true);
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
            >
              + Create Tag Category
            </button>
          )}
        </div>

        {isCreatingTagCategory && (
          <div className="relative">
            {isSavingTagCategory && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dark-900/80 backdrop-blur-sm rounded-xl">
                <img
                  src="/logo/whistle-chrome-liquid.gif"
                  alt="Saving"
                  className="h-20 w-20 object-contain mb-3"
                />
                <span className="text-sm font-medium text-text-secondary">
                  {editingTagCategory ? 'Updating tag category...' : 'Creating tag category...'}
                </span>
              </div>
            )}
          <form onSubmit={handleTagCategorySubmit} className="space-y-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tag Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagCategoryFormData.name}
                  onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={tagCategoryFormData.order}
                  onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, order: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={tagCategoryFormData.description}
                onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Color
              </label>
              
              {/* Rainbow Preset Colors */}
              <div className="flex flex-wrap gap-2 mb-3">
                {TAG_CATEGORY_RAINBOW_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagCategoryFormData({ ...tagCategoryFormData, color })}
                    className={cn(
                      "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                      tagCategoryFormData.color === color
                        ? "border-cyan-500 ring-2 ring-cyan-500/50 scale-105"
                        : "border-dark-600 hover:border-dark-400"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Option */}
              <details className="mt-2">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary mb-2">
                  + Add custom color
                </summary>
                <div className="flex gap-2 mt-2">
                  <input
                    type="color"
                    value={tagCategoryFormData.color}
                    onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, color: e.target.value })}
                    className="w-12 h-10 rounded border border-dark-600 bg-dark-900 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tagCategoryFormData.color}
                    onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, color: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                    placeholder="#00E8F8"
                  />
                </div>
              </details>
              
              <p className="text-xs text-text-muted mt-2">
                This color will be used as the default for all tags in this category
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={tagCategoryFormData.canBeCorrectAnswer}
                  onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, canBeCorrectAnswer: e.target.checked })}
                  className="rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500"
                />
                Can be used for correct answers
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={tagCategoryFormData.allowLinks}
                  onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, allowLinks: e.target.checked })}
                  className="rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500"
                />
                Allow optional links on tags
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={tagCategoryFormData.isActive}
                  onChange={(e) => setTagCategoryFormData({ ...tagCategoryFormData, isActive: e.target.checked })}
                  className="rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500"
                />
                Active
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetTagCategoryForm}
                className="px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-text-primary hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                {editingTagCategory ? 'Update Tag Category' : 'Create Tag Category'}
              </button>
            </div>
          </form>
          </div>
        )}

        <div className="space-y-2">
          {tagCategories.map(category => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 rounded-lg bg-dark-900/40 border border-dark-600"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color || GROUP_COLORS[category.slug] || '#00E8F8' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{category.name}</span>
                    {!category.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted">
                    {category.canBeCorrectAnswer ? 'Correct answer + filter' : 'Filter only'}
                    {category.allowLinks ? ' • Links enabled' : ''}
                    {category._count?.tags !== undefined && (
                      <span> • {category._count.tags} tag{category._count.tags !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTagCategoryEdit(category)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/20 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTagCategoryDelete(category)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tagCategories.length === 0 && (
            <p className="text-text-muted text-sm">No tag categories yet.</p>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      <div ref={formRef} className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {isCreating ? (editingTag ? 'Edit Tag' : 'Create New Tag') : 'Tag Management'}
            </h3>
            <p className="text-sm text-text-muted mt-1">
              <strong>Category</strong> tags are also criteria groups. <strong>Criteria</strong> tags belong to category tags.
            </p>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
            >
              + Create Tag
            </button>
          )}
        </div>

        {isCreating && (
          <div className="relative">
            {isSavingTag && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dark-900/80 backdrop-blur-sm rounded-xl">
                <img
                  src="/logo/whistle-chrome-liquid.gif"
                  alt="Saving"
                  className="h-20 w-20 object-contain mb-3"
                />
                <span className="text-sm font-medium text-text-secondary">
                  {editingTag ? 'Updating tag...' : 'Creating tag...'}
                </span>
              </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="relative" ref={groupDropdownRef}>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tag Category
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-dark-600"
                      style={{ backgroundColor: selectedTagCategory?.color || (selectedTagCategorySlug && GROUP_COLORS[selectedTagCategorySlug]) || '#00E8F8' }} 
                    />
                    <span>{selectedTagCategory?.name || 'Select Tag Category'}</span>
                  </div>
                  <svg 
                    className={cn(
                      "w-4 h-4 text-text-secondary transition-transform", 
                      isGroupDropdownOpen && "rotate-180"
                    )}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isGroupDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-dark-900 border border-dark-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {tagCategories.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleGroupSelect(category.id)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-dark-800 transition-colors"
                      >
                        <div 
                          className="w-4 h-4 rounded-full border border-dark-600"
                          style={{ backgroundColor: category.color || GROUP_COLORS[category.slug] || '#00E8F8' }}
                        />
                        <span className="text-text-primary">{category.name}</span>
                      </button>
                    ))}
                    {tagCategories.length === 0 && (
                      <div className="px-4 py-2 text-sm text-text-muted">
                        No tag categories yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Category Dropdown - Only for CRITERIA group */}
            {selectedTagCategorySlug === CRITERIA_TAG_CATEGORY_SLUG && (
              <div className="relative" ref={categoryDropdownRef}>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Parent Category <span className="text-cyan-500 text-xs">(Which category does this criterion belong to?)</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                >
                  <div className="flex items-center gap-2">
                    {formData.parentCategory ? (
                      <>
                        <div 
                          className="w-4 h-4 rounded border border-dark-600"
                          style={{ backgroundColor: categoryTags.find(c => c.name === formData.parentCategory)?.color || '#00E8F8' }} 
                        />
                        <span>{formData.parentCategory}</span>
                      </>
                    ) : (
                      <span className="text-text-muted">Select Category...</span>
                    )}
                  </div>
                  <svg 
                    className={cn(
                      "w-4 h-4 text-text-secondary transition-transform", 
                      isCategoryDropdownOpen && "rotate-180"
                    )}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-dark-900 border border-dark-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('')}
                      className="w-full flex items-center px-4 py-2 text-sm text-text-muted hover:bg-dark-800 transition-colors"
                    >
                      No Category
                    </button>
                    {sortedDropdownTags.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.name)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-dark-800 transition-colors"
                      >
                        <div 
                          className="w-4 h-4 rounded border border-dark-600"
                          style={{ backgroundColor: cat.color || '#00E8F8' }}
                        />
                        <span className="text-text-primary">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-text-muted mt-1">
                  Groups this criteria tag under a category (e.g., Handball, Offside, DOGSO)
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Color
              </label>
              
              {/* SANCTION tags use fixed color */}
              {selectedTagCategorySlug === SANCTION_TAG_CATEGORY_SLUG ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-dark-900/50 border border-dark-600">
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-cyan-500 ring-2 ring-cyan-500/50"
                    style={{ backgroundColor: selectedTagCategory?.color || GROUP_COLORS[SANCTION_TAG_CATEGORY_SLUG] }}
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Sanction tags use a fixed color
                    </p>
                    <p className="text-xs text-text-muted">
                      All sanction tags share the same color for consistency
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Preset Colors */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(PRESET_COLORS[selectedTagCategorySlug || CATEGORY_TAG_CATEGORY_SLUG] || PRESET_COLORS[CATEGORY_TAG_CATEGORY_SLUG]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                          formData.color === color
                            ? "border-cyan-500 ring-2 ring-cyan-500/50"
                            : "border-dark-600 hover:border-dark-400"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Custom Color Option */}
                  <details className="mt-2">
                    <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary mb-2">
                      + Add custom color
                    </summary>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="color"
                        value={customColor || formData.color}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setFormData({ ...formData, color: e.target.value });
                        }}
                        className="w-12 h-10 rounded border border-dark-600 bg-dark-900 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColor || formData.color}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          setFormData({ ...formData, color: e.target.value });
                        }}
                        className="flex-1 px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                        placeholder="#00E8F8"
                      />
                    </div>
                  </details>
                </>
              )}
            </div>

            {selectedTagCategory?.allowLinks && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Optional Link URL
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                  placeholder="https://example.com"
                />
                <p className="text-xs text-text-muted mt-1">
                  Only tags in this category can have links.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Status
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm font-medium text-text-primary">Active</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                placeholder="Optional description..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-text-primary hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                {editingTag ? 'Update Tag' : 'Create Tag'}
              </button>
            </div>
          </form>
          </div>
        )}
      </div>

      {/* Collapsible Tag Category Tabs */}
      {tagCategories.map((category) => {
        const groupTags = groupedTags[category.id] || [];
        const isExpanded = expandedTabs[category.id] ?? true;
        const groupColor = category.color || GROUP_COLORS[category.slug] || '#00E8F8';

        if (category.slug === CRITERIA_TAG_CATEGORY_SLUG) {
          // Special rendering for Criteria with sub-grouping
          return (
            <div key={category.id} className="rounded-2xl bg-dark-800/50 border-2 overflow-hidden" style={{ borderColor: groupColor }}>
              <button
                onClick={() => toggleTab(category.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-dark-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: groupColor }}
                  />
                  <h4 className="text-lg font-semibold text-text-primary">
                    {category.name}
                    <span className="text-sm font-normal text-text-muted ml-2">
                      ({groupTags.length})
                    </span>
                  </h4>
                </div>
                <svg
                  className={cn(
                    "w-5 h-5 text-text-muted transition-transform",
                    isExpanded && "rotate-180"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="p-6 pt-0 space-y-4">
                  {/* Criteria grouped by CATEGORY tags - Groups auto-generated */}
                  {sortedCategoryEntries.map(([categoryName, criteriaTags]) => {
                    const isSubExpanded = expandedSubCategories[categoryName] ?? false;
                    // Get the actual CATEGORY tag object
                    const categoryTag = categoryTagsMap[categoryName];
                    
                    if (!categoryTag) return null; // Skip if category was deleted
                    
                    return (
                      <div key={categoryName} className="rounded-xl bg-dark-900/30 border border-dark-600 overflow-hidden">
                        <button
                          onClick={() => toggleSubCategory(categoryName)}
                          className="w-full flex items-center justify-between p-4 hover:bg-dark-700/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: categoryTag.color || '#00E8F8' }}
                            />
                            <h5 className="font-semibold text-text-secondary uppercase tracking-wider text-sm">
                              {categoryTag.name}
                            </h5>
                            <span className="text-xs text-text-muted bg-dark-800 px-2 py-0.5 rounded-full">
                              {criteriaTags.length} criteria
                            </span>
                          </div>
                          <svg
                            className={cn(
                              "w-4 h-4 text-text-muted transition-transform",
                              isSubExpanded && "rotate-180"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isSubExpanded && (
                          <div className="p-4 pt-0 space-y-2 border-t border-dark-600/50 mt-2">
                            {/* Show the CATEGORY tag itself first */}
                            <div className="mb-3 pb-3 border-b border-dark-600/30">
                              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Category Tag:</div>
                              {renderTagItem(categoryTag)}
                            </div>
                            
                            {/* Then show all criteria under this category */}
                            {criteriaTags.length > 0 ? (
                              <>
                                <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">
                                  Criteria Tags ({criteriaTags.length}):
                                </div>
                                {criteriaTags.map(renderTagItem)}
                              </>
                            ) : (
                              <div className="text-sm text-text-muted italic text-center py-4">
                                No criteria yet. Create criteria with parentCategory: "{categoryTag.name}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* General criteria (no category) */}
                  {generalCriteria.length > 0 && (
                    <div className="rounded-xl bg-dark-900/30 border border-dark-600 overflow-hidden">
                      <button
                        onClick={() => toggleSubCategory('No Category')}
                        className="w-full flex items-center justify-between p-4 hover:bg-dark-700/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded border border-dark-600 bg-dark-800" />
                          <h5 className="font-semibold text-text-secondary uppercase tracking-wider text-sm">
                            No Category
                          </h5>
                          <span className="text-xs text-text-muted bg-dark-800 px-2 py-0.5 rounded-full">
                            {generalCriteria.length}
                          </span>
                        </div>
                        <svg
                          className={cn(
                            "w-4 h-4 text-text-muted transition-transform",
                            (expandedSubCategories['No Category'] ?? false) && "rotate-180"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {(expandedSubCategories['No Category'] ?? false) && (
                        <div className="p-4 pt-0 space-y-2 border-t border-dark-600/50 mt-2">
                          {generalCriteria.map(renderTagItem)}
                        </div>
                      )}
                    </div>
                  )}

                  {categoryTags.length === 0 && (
                    <p className="text-text-muted text-center py-8">No criteria tags yet</p>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Regular category rendering
        return (
          <div key={category.id} className="rounded-2xl bg-dark-800/50 border-2 overflow-hidden" style={{ borderColor: groupColor }}>
            <button
              onClick={() => toggleTab(category.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-dark-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: groupColor }}
                />
                <h4 className="text-lg font-semibold text-text-primary">
                  {category.name}
                  <span className="text-sm font-normal text-text-muted ml-2">
                    ({groupTags.length})
                  </span>
                </h4>
              </div>
              <svg
                className={cn(
                  "w-5 h-5 text-text-muted transition-transform",
                  isExpanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="p-6 pt-0">
                <div className="space-y-2">
                  {(category.slug === CATEGORY_TAG_CATEGORY_SLUG 
                    ? [...groupTags].sort((a, b) => {
                        const indexA = CATEGORY_ORDER.indexOf(a.name);
                        const indexB = CATEGORY_ORDER.indexOf(b.name);
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      })
                    : groupTags
                  ).map(renderTagItem)}
                </div>
                {groupTags.length === 0 && (
                  <p className="text-text-muted text-center py-8">No {category.name.toLowerCase()} tags yet</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {tags.length === 0 && (
        <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-12 text-center">
          <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-text-secondary">No tags found. Check console for debugging info.</p>
          <p className="text-text-muted text-sm mt-2">If tags exist in database, there may be an API issue.</p>
        </div>
      )}
    </div>
  );
}
