"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  slug: string;
  category: string;
  color?: string;
  description?: string;
  isActive: boolean;
  _count?: { videos: number };
}

interface TagManagerProps {
  tags: Tag[];
  onRefresh: () => void;
}

const TAG_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'SCENARIO', label: 'Scenario' },
];

export function TagManager({ tags, onRefresh }: TagManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'GENERAL',
    color: '#00E8F8',
    description: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'GENERAL',
      color: '#00E8F8',
      description: '',
      isActive: true,
    });
    setIsCreating(false);
    setEditingTag(null);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      category: tag.category,
      color: tag.color || '#00E8F8',
      description: tag.description || '',
      isActive: tag.isActive,
    });
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTag
        ? `/api/admin/library/tags/${editingTag.id}`
        : '/api/admin/library/tags';
      
      const response = await fetch(url, {
        method: editingTag ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save tag');

      alert(editingTag ? 'Tag updated successfully!' : 'Tag created successfully!');
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save tag');
    }
  };

  const handleDelete = async (tagId: string, tagName: string, videoCount: number) => {
    if (videoCount > 0) {
      if (!confirm(`This tag is used by ${videoCount} video(s). Are you sure you want to delete "${tagName}"?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${tagName}"?`)) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/library/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      alert('Tag deleted successfully!');
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete tag');
    }
  };

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            {isCreating ? (editingTag ? 'Edit Tag' : 'Create New Tag') : 'Tag Management'}
          </h3>
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

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                >
                  {TAG_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded border border-dark-600 bg-dark-900 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                    placeholder="#00E8F8"
                  />
                </div>
              </div>

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
        )}
      </div>

      {/* Tags List */}
      {Object.entries(groupedTags).map(([category, categoryTags]) => (
        <div key={category} className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
          <h4 className="text-lg font-semibold text-text-primary mb-4">
            {TAG_CATEGORIES.find(c => c.value === category)?.label || category} Tags
            <span className="text-sm font-normal text-text-muted ml-2">({categoryTags.length})</span>
          </h4>

          <div className="space-y-2">
            {categoryTags.map(tag => (
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
            ))}
          </div>
        </div>
      ))}

      {tags.length === 0 && (
        <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-12 text-center">
          <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-text-secondary">No tags created yet</p>
        </div>
      )}
    </div>
  );
}
