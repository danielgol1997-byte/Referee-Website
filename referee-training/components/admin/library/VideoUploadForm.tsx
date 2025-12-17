"use client";

import { useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

interface VideoUploadFormProps {
  videoCategories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; color?: string }>;
  onSuccess?: () => void;
  editingVideo?: any;
}

const LAWS = Array.from({ length: 17 }, (_, i) => ({ value: i + 1, label: `Law ${i + 1}` }));
const RESTART_TYPES = [
  { value: 'DIRECT_FREE_KICK', label: 'Direct Free Kick' },
  { value: 'INDIRECT_FREE_KICK', label: 'Indirect Free Kick' },
  { value: 'PENALTY_KICK', label: 'Penalty Kick' },
  { value: 'CORNER_KICK', label: 'Corner Kick' },
  { value: 'GOAL_KICK', label: 'Goal Kick' },
  { value: 'THROW_IN', label: 'Throw In' },
  { value: 'KICK_OFF', label: 'Kick Off' },
  { value: 'DROPPED_BALL', label: 'Dropped Ball' },
];
const SANCTION_TYPES = [
  { value: 'NO_CARD', label: 'No Card' },
  { value: 'YELLOW_CARD', label: 'Yellow Card' },
  { value: 'RED_CARD', label: 'Red Card' },
  { value: 'DOUBLE_YELLOW', label: 'Double Yellow' },
  { value: 'PENALTY', label: 'Penalty' },
];
const VIDEO_TYPES = [
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'MATCH_CLIP', label: 'Match Clip' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'EXAMPLE', label: 'Example' },
];

export function VideoUploadForm({ videoCategories, tags, onSuccess, editingVideo }: VideoUploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(editingVideo?.fileUrl || '');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(editingVideo?.thumbnailUrl || '');
  
  // Form state
  const [formData, setFormData] = useState({
    title: editingVideo?.title || '',
    description: editingVideo?.description || '',
    videoType: editingVideo?.videoType || 'MATCH_CLIP',
    videoCategoryId: editingVideo?.videoCategoryId || '',
    lawNumbers: editingVideo?.lawNumbers || [],
    tagIds: editingVideo?.tags?.map((t: any) => t.tagId) || [],
    sanctionType: editingVideo?.sanctionType || '',
    restartType: editingVideo?.restartType || '',
    correctDecision: editingVideo?.correctDecision || '',
    decisionExplanation: editingVideo?.decisionExplanation || '',
    keyPoints: editingVideo?.keyPoints || [''],
    commonMistakes: editingVideo?.commonMistakes || [''],
    varRelevant: editingVideo?.varRelevant || false,
    varNotes: editingVideo?.varNotes || '',
    isActive: editingVideo?.isActive ?? true,
    isFeatured: editingVideo?.isFeatured || false,
  });

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleKeyPointChange = (index: number, value: string) => {
    const newKeyPoints = [...formData.keyPoints];
    newKeyPoints[index] = value;
    setFormData({ ...formData, keyPoints: newKeyPoints });
  };

  const addKeyPoint = () => {
    setFormData({ ...formData, keyPoints: [...formData.keyPoints, ''] });
  };

  const removeKeyPoint = (index: number) => {
    const newKeyPoints = formData.keyPoints.filter((_kp: string, i: number) => i !== index);
    setFormData({ ...formData, keyPoints: newKeyPoints });
  };

  const handleCommonMistakeChange = (index: number, value: string) => {
    const newMistakes = [...formData.commonMistakes];
    newMistakes[index] = value;
    setFormData({ ...formData, commonMistakes: newMistakes });
  };

  const addCommonMistake = () => {
    setFormData({ ...formData, commonMistakes: [...formData.commonMistakes, ''] });
  };

  const removeCommonMistake = (index: number) => {
    const newMistakes = formData.commonMistakes.filter((_m: string, i: number) => i !== index);
    setFormData({ ...formData, commonMistakes: newMistakes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add files
      if (videoFile) formDataToSend.append('video', videoFile);
      if (thumbnailFile) formDataToSend.append('thumbnail', thumbnailFile);
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      const url = editingVideo 
        ? `/api/admin/library/videos/${editingVideo.id}`
        : '/api/admin/library/videos';
      
      const method = editingVideo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) throw new Error('Upload failed');

      alert(editingVideo ? 'Video updated successfully!' : 'Video uploaded successfully!');
      onSuccess?.();
      
      // Reset form if creating new
      if (!editingVideo) {
        setVideoFile(null);
        setThumbnailFile(null);
        setVideoPreview('');
        setThumbnailPreview('');
        setFormData({
          title: '',
          description: '',
          videoType: 'MATCH_CLIP',
          videoCategoryId: '',
          lawNumbers: [],
          tagIds: [],
          sanctionType: '',
          restartType: '',
          correctDecision: '',
          decisionExplanation: '',
          keyPoints: [''],
          commonMistakes: [''],
          varRelevant: false,
          varNotes: '',
          isActive: true,
          isFeatured: false,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video File Upload */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">📹 Video File</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Upload Video {!editingVideo && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-dark-900 hover:file:bg-cyan-400 file:cursor-pointer"
              required={!editingVideo}
            />
          </div>
          
          {videoPreview && (
            <div className="rounded-lg overflow-hidden bg-dark-900">
              <video src={videoPreview} controls className="w-full max-h-64" />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Upload */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">🖼️ Thumbnail</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Upload Thumbnail
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailFileChange}
              className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-dark-900 hover:file:bg-cyan-400 file:cursor-pointer"
            />
          </div>
          
          {thumbnailPreview && (
            <div className="rounded-lg overflow-hidden bg-dark-900 max-w-md">
              <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">📝 Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Video Type
              </label>
              <select
                value={formData.videoType}
                onChange={(e) => setFormData({ ...formData, videoType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
              >
                {VIDEO_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.videoCategoryId}
                onChange={(e) => setFormData({ ...formData, videoCategoryId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                required
              >
                <option value="">Select category...</option>
                {videoCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">⚖️ Classification</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Laws of the Game
            </label>
            <MultiSelect
              value={formData.lawNumbers}
              onChange={(values) => setFormData({ ...formData, lawNumbers: values as number[] })}
              options={LAWS}
              placeholder="Add law"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tags
            </label>
            <MultiSelect
              value={formData.tagIds}
              onChange={(values) => setFormData({ ...formData, tagIds: values as string[] })}
              options={tags.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Add tag"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Sanction Type
              </label>
              <select
                value={formData.sanctionType}
                onChange={(e) => setFormData({ ...formData, sanctionType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {SANCTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Restart Type
              </label>
              <select
                value={formData.restartType}
                onChange={(e) => setFormData({ ...formData, restartType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="">None</option>
                {RESTART_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Information */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">✅ Decision Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Correct Decision
            </label>
            <input
              type="text"
              value={formData.correctDecision}
              onChange={(e) => setFormData({ ...formData, correctDecision: e.target.value })}
              placeholder="e.g., Penalty Kick + Yellow Card"
              className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Explanation
            </label>
            <textarea
              value={formData.decisionExplanation}
              onChange={(e) => setFormData({ ...formData, decisionExplanation: e.target.value })}
              rows={4}
              placeholder="Detailed explanation of why this is the correct decision..."
              className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              💡 Key Decision Points
            </label>
            <div className="space-y-2">
              {formData.keyPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => handleKeyPointChange(index, e.target.value)}
                    placeholder="Key point..."
                    className="flex-1 px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyPoint(index)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKeyPoint}
                className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                + Add key point
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              ⚠️ Common Mistakes
            </label>
            <div className="space-y-2">
              {formData.commonMistakes.map((mistake, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={mistake}
                    onChange={(e) => handleCommonMistakeChange(index, e.target.value)}
                    placeholder="Common mistake..."
                    className="flex-1 px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeCommonMistake(index)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCommonMistake}
                className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                + Add common mistake
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VAR Information */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">🎬 VAR Information</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.varRelevant}
              onChange={(e) => setFormData({ ...formData, varRelevant: e.target.checked })}
              className="w-5 h-5 rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-dark-800"
            />
            <span className="text-sm font-medium text-text-primary">VAR Reviewable Incident</span>
          </label>

          {formData.varRelevant && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                VAR Protocol Notes
              </label>
              <textarea
                value={formData.varNotes}
                onChange={(e) => setFormData({ ...formData, varNotes: e.target.value })}
                rows={3}
                placeholder="VAR protocol information..."
                className="w-full px-4 py-2 rounded-lg bg-dark-900 border border-dark-600 text-text-primary focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          )}
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">👁️ Visibility</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-dark-800"
            />
            <span className="text-sm font-medium text-text-primary">Active (visible to users)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="w-5 h-5 rounded border-dark-600 bg-dark-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-dark-800"
            />
            <span className="text-sm font-medium text-text-primary">Featured (show in carousel)</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "px-6 py-3 rounded-lg font-semibold transition-all",
            "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900",
            "hover:from-cyan-400 hover:to-cyan-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg hover:shadow-cyan-500/30"
          )}
        >
          {loading ? 'Uploading...' : editingVideo ? 'Update Video' : 'Upload Video'}
        </button>
      </div>
    </form>
  );
}
