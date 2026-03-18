"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PromptConfig {
  id: string | null;
  key: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  userPromptTemplate: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  isDefault: boolean;
  updatedBy: { name: string | null; email: string } | null;
}

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
  { value: "gpt-4o", label: "GPT-4o (more capable, slower)" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
];

export function AiPromptConfigEditor() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPromptTemplate, setEditUserPromptTemplate] = useState("");
  const [editModel, setEditModel] = useState("gpt-4o-mini");
  const [editTemperature, setEditTemperature] = useState(0.3);
  const [editMaxTokens, setEditMaxTokens] = useState(2000);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/ai-config");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setConfigs(data.configs || []);
      if (data.configs?.length > 0 && !activeKey) {
        selectConfig(data.configs[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectConfig = (config: PromptConfig) => {
    setActiveKey(config.key);
    setEditSystemPrompt(config.systemPrompt);
    setEditUserPromptTemplate(config.userPromptTemplate || "");
    setEditModel(config.model);
    setEditTemperature(config.temperature);
    setEditMaxTokens(config.maxTokens);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    if (!activeKey) return;
    const config = configs.find((c) => c.key === activeKey);
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: activeKey,
          name: config.name,
          description: config.description,
          systemPrompt: editSystemPrompt,
          userPromptTemplate: editUserPromptTemplate || null,
          model: editModel,
          temperature: editTemperature,
          maxTokens: editMaxTokens,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      setSuccessMsg("Prompt configuration saved.");
      fetchConfigs();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const activeConfig = configs.find((c) => c.key === activeKey);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        Loading AI configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          AI Prompt Configuration
        </h3>
        <p className="text-sm text-text-muted mt-1">
          Edit the system prompts that control how AI generates search
          descriptions and processes user queries. Changes take effect
          immediately.
        </p>
      </div>

      {/* Config selector tabs */}
      <div className="flex gap-2">
        {configs.map((config) => (
          <button
            key={config.key}
            type="button"
            onClick={() => selectConfig(config)}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeKey === config.key
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                : "bg-dark-800 border border-dark-600 text-text-secondary hover:text-text-primary hover:bg-dark-700"
            )}
          >
            {config.name}
          </button>
        ))}
      </div>

      {activeConfig && (
        <div className="space-y-5 rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
          {/* Description */}
          {activeConfig.description && (
            <p className="text-sm text-text-muted bg-dark-900/50 rounded-lg p-3 border border-dark-700">
              {activeConfig.description}
            </p>
          )}

          {/* Model + Temperature + Max Tokens */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Model
              </label>
              <select
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
                className="w-full rounded-lg bg-dark-900 border border-dark-600 text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Temperature ({editTemperature.toFixed(2)})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={editTemperature}
                onChange={(e) =>
                  setEditTemperature(parseFloat(e.target.value))
                }
                className="w-full mt-2 accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Max Tokens
              </label>
              <input
                type="number"
                value={editMaxTokens}
                onChange={(e) =>
                  setEditMaxTokens(parseInt(e.target.value) || 2000)
                }
                min={100}
                max={8000}
                className="w-full rounded-lg bg-dark-900 border border-dark-600 text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              System Prompt
            </label>
            <p className="text-xs text-text-muted mb-2">
              The main instructions for the AI. Use{" "}
              <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                {"{{TAG_TAXONOMY}}"}
              </code>{" "}
              to inject the current tag taxonomy automatically.
            </p>
            <textarea
              value={editSystemPrompt}
              onChange={(e) => setEditSystemPrompt(e.target.value)}
              rows={16}
              className="w-full rounded-lg bg-dark-900 border border-dark-600 text-text-primary px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y"
            />
          </div>

          {/* User Prompt Template */}
          {activeConfig.key === "search_description_generation" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                User Prompt Template
              </label>
              <p className="text-xs text-text-muted mb-2">
                Template for per-video data. Available variables:{" "}
                <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                  {"{{title}}"}
                </code>
                ,{" "}
                <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                  {"{{tags}}"}
                </code>
                ,{" "}
                <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                  {"{{rawDescription}}"}
                </code>
                ,{" "}
                <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                  {"{{restartType}}"}
                </code>
                ,{" "}
                <code className="px-1 py-0.5 bg-dark-700 rounded text-cyan-300">
                  {"{{sanctionType}}"}
                </code>
                , etc.
              </p>
              <textarea
                value={editUserPromptTemplate}
                onChange={(e) =>
                  setEditUserPromptTemplate(e.target.value)
                }
                rows={12}
                className="w-full rounded-lg bg-dark-900 border border-dark-600 text-text-primary px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y"
              />
            </div>
          )}

          {/* Status messages */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
              {successMsg}
            </p>
          )}

          {/* Last updated info */}
          {activeConfig.updatedBy && !activeConfig.isDefault && (
            <p className="text-xs text-text-muted">
              Last updated by {activeConfig.updatedBy.name || activeConfig.updatedBy.email}
            </p>
          )}
          {activeConfig.isDefault && (
            <p className="text-xs text-text-muted">
              Using built-in default prompt. Save to create a custom version.
            </p>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold text-sm hover:from-purple-500 hover:to-cyan-500 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
