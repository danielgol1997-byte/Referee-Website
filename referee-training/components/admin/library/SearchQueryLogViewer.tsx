"use client";

import { useState, useEffect, useCallback } from "react";

interface LogEntry {
  id: string;
  rawQuery: string;
  expandedQuery: string | null;
  detectedLanguage: string | null;
  inferredTags: Array<{ tagSlug: string; confidence: string }> | null;
  selectedTagFilters: string[];
  resultVideoIds: string[];
  resultCount: number;
  searchMethod: string;
  durationMs: number | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface Settings {
  searchLoggingEnabled: boolean;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400 border-green-500/30 bg-green-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  low: "text-red-400 border-red-500/30 bg-red-500/10",
};

export function SearchQueryLogViewer() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [togglingLog, setTogglingLog] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/developer-settings");
      if (res.ok) setSettings((await res.json()).settings);
    } catch {}
  }, []);

  const loadLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/search-logs?page=${p}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadLogs(1);
  }, [loadSettings, loadLogs]);

  const toggleLogging = async () => {
    if (!settings) return;
    setTogglingLog(true);
    try {
      const res = await fetch("/api/admin/developer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchLoggingEnabled: !settings.searchLoggingEnabled }),
      });
      if (res.ok) setSettings((await res.json()).settings);
    } catch {}
    setTogglingLog(false);
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/search-logs", { method: "DELETE" });
      if (res.ok) {
        setEntries([]);
        setTotal(0);
        setConfirmClear(false);
      }
    } catch {}
    setClearing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Search Query Log</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {total} search{total !== 1 ? "es" : ""} recorded — use this to identify irrelevant results and improve the AI model
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Logging toggle */}
          {settings && (
            <button
              type="button"
              onClick={toggleLogging}
              disabled={togglingLog}
              title={settings.searchLoggingEnabled ? "Logging ON — click to disable" : "Logging OFF — click to enable"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                settings.searchLoggingEnabled
                  ? "border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  : "border-dark-600 bg-dark-800 text-text-muted hover:text-text-primary"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${settings.searchLoggingEnabled ? "bg-green-400 animate-pulse" : "bg-dark-500"}`} />
              {settings.searchLoggingEnabled ? "Logging on" : "Logging off"}
            </button>
          )}
          {/* Clear all */}
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Clear all logs?</span>
              <button
                type="button"
                onClick={clearLogs}
                disabled={clearing}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {clearing ? "…" : "Yes, clear"}
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="text-xs text-text-muted hover:text-text-primary transition-colors px-2">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-red-400 hover:border-red-500/30 text-xs transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => loadLogs(page)}
            className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dark-600 bg-dark-800/40 px-6 py-12 text-center text-text-muted text-sm">
          No searches recorded yet.{" "}
          {!settings?.searchLoggingEnabled && <span className="text-amber-400">Logging is currently disabled.</span>}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => {
              const isExpanded = expanded === entry.id;
              return (
                <div key={entry.id} className="rounded-xl border border-dark-600 bg-dark-800/40 overflow-hidden">
                  {/* Summary row */}
                  {(() => {
                    const manualTags = entry.selectedTagFilters ?? [];
                    const aiAutoApplied = (entry.inferredTags ?? []).filter(t => t.confidence === "high");
                    const aiSuggested = (entry.inferredTags ?? []).filter(t => t.confidence === "medium");
                    const totalTagsUsed = manualTags.length + aiAutoApplied.length;
                    return (
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : entry.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-dark-700/30 transition-colors"
                      >
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border shrink-0 ${entry.searchMethod.startsWith("semantic") ? "text-purple-400 border-purple-500/30 bg-purple-500/10" : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"}`}>
                          {entry.searchMethod}
                        </span>
                        <span className="text-sm text-text-primary font-medium truncate flex-1">
                          {entry.rawQuery}
                        </span>
                        {/* Tag summary chips */}
                        <div className="flex items-center gap-1 shrink-0">
                          {totalTagsUsed === 0 && aiSuggested.length === 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] border border-dark-600 text-dark-400 font-mono">no tags</span>
                          ) : (
                            <>
                              {manualTags.length > 0 && (
                                <span title={`Manual tags: ${manualTags.join(", ")}`} className="px-1.5 py-0.5 rounded text-[10px] border border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono">
                                  {manualTags.length} manual
                                </span>
                              )}
                              {aiAutoApplied.length > 0 && (
                                <span title={`AI auto-applied: ${aiAutoApplied.map(t => t.tagSlug).join(", ")}`} className="px-1.5 py-0.5 rounded text-[10px] border border-green-500/30 bg-green-500/10 text-green-400 font-mono">
                                  {aiAutoApplied.length} AI✓
                                </span>
                              )}
                              {aiSuggested.length > 0 && (
                                <span title={`AI suggested: ${aiSuggested.map(t => t.tagSlug).join(", ")}`} className="px-1.5 py-0.5 rounded text-[10px] border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-mono">
                                  {aiSuggested.length} suggested
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-xs text-text-muted shrink-0">
                          {entry.resultCount} result{entry.resultCount !== 1 ? "s" : ""}
                          {entry.durationMs != null && <span className="ml-1 text-dark-400">· {entry.durationMs}ms</span>}
                        </span>
                        <span className="text-xs text-dark-400 shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <svg className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    );
                  })()}

                  {/* Expanded detail */}
                  {isExpanded && (() => {
                    const manualTags = entry.selectedTagFilters ?? [];
                    const aiAutoApplied = (entry.inferredTags ?? []).filter(t => t.confidence === "high");
                    const aiSuggested = (entry.inferredTags ?? []).filter(t => t.confidence === "medium");
                    const noTagsUsed = manualTags.length === 0 && aiAutoApplied.length === 0 && aiSuggested.length === 0;
                    return (
                      <div className="px-4 pb-4 space-y-3 border-t border-dark-700 text-xs">
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Raw query</p>
                            <p className="text-text-secondary">{entry.rawQuery}</p>
                          </div>
                          {entry.expandedQuery && entry.expandedQuery !== entry.rawQuery && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">AI expanded query</p>
                              <p className="text-text-secondary">{entry.expandedQuery}</p>
                            </div>
                          )}
                          {entry.detectedLanguage && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Detected language</p>
                              <p className="text-text-secondary">{entry.detectedLanguage}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">User</p>
                            <p className="text-text-secondary">{entry.user.name ?? entry.user.email}</p>
                          </div>
                        </div>

                        {/* Tag breakdown — always show all three sections */}
                        <div className="rounded-lg border border-dark-600 bg-dark-900/40 p-3 space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Tags used in this search</p>

                          {/* Manual pre-existing tags */}
                          <div>
                            <p className="text-[10px] font-medium text-blue-400 mb-1.5">
                              Manual tags (pre-existing) — hard filter
                            </p>
                            {manualTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {manualTags.map((slug) => (
                                  <span key={slug} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono">{slug}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-dark-400 italic">None</span>
                            )}
                          </div>

                          {/* AI auto-applied tags (high confidence) */}
                          <div>
                            <p className="text-[10px] font-medium text-green-400 mb-1.5">
                              AI auto-applied tags (high confidence) — hard filter
                            </p>
                            {aiAutoApplied.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {aiAutoApplied.map((t) => (
                                  <span key={t.tagSlug} className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300 font-mono">{t.tagSlug}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-dark-400 italic">None</span>
                            )}
                          </div>

                          {/* AI suggested tags (medium confidence) */}
                          <div>
                            <p className="text-[10px] font-medium text-yellow-400 mb-1.5">
                              AI suggested tags (medium confidence) — soft boost only
                            </p>
                            {aiSuggested.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {aiSuggested.map((t) => (
                                  <span key={t.tagSlug} className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-mono">{t.tagSlug}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-dark-400 italic">None</span>
                            )}
                          </div>

                          {noTagsUsed && (
                            <p className="text-dark-400 text-[10px] italic pt-1">No tags were used — pure text/semantic search only.</p>
                          )}
                        </div>

                        {entry.resultVideoIds?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                              Returned video IDs ({entry.resultCount})
                            </p>
                            <p className="text-text-muted font-mono leading-relaxed break-all">
                              {entry.resultVideoIds.join(", ")}
                            </p>
                          </div>
                        )}

                        {entry.resultCount === 0 && (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-400">
                            ⚠ No results returned — this query may need prompt or tag improvements.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button type="button" onClick={() => loadLogs(page - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors">
                ← Prev
              </button>
              <span className="text-xs text-text-muted">{page} / {pages}</span>
              <button type="button" onClick={() => loadLogs(page + 1)} disabled={page === pages} className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
