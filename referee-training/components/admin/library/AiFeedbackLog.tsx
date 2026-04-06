"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedbackEntry {
  id: string;
  videoId: string;
  videoTitle: string | null;
  rawInput: string;
  existingTags: string | null;
  aiOutput: string;
  aiSuggestedTags: string[];
  rating: number;
  issueType: string | null;
  note: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
}

const ISSUE_LABELS: Record<string, string> = {
  hallucination: "Hallucination",
  embellishment: "Embellishment",
  wrong_tag: "Wrong tag",
  translation: "Translation error",
  too_short: "Too short",
  other: "Other",
};

const RATING_COLORS: Record<number, string> = {
  1: "text-red-400 bg-red-500/10 border-red-500/20",
  2: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  3: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  4: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  5: "text-green-400 bg-green-500/10 border-green-500/20",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`w-3 h-3 ${n <= rating ? "text-amber-400" : "text-dark-600"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      ))}
    </span>
  );
}

function ExpandableText({ text, maxLen = 200 }: { text: string; maxLen?: number }) {
  const [open, setOpen] = useState(false);
  if (text.length <= maxLen) return <span>{text}</span>;
  return (
    <span>
      {open ? text : text.slice(0, maxLen) + "…"}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 text-cyan-400 hover:text-cyan-300 text-xs underline"
      >
        {open ? "less" : "more"}
      </button>
    </span>
  );
}

export function AiFeedbackLog() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-feedback?page=${p}`);
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
    load(1);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted text-sm">
        Loading feedback…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">AI Generation Feedback</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {total} report{total !== 1 ? "s" : ""} collected — review these to improve the AI prompt
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(page)}
          className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs transition-colors"
        >
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dark-600 bg-dark-800/40 px-6 py-12 text-center text-text-muted text-sm">
          No feedback yet. Use the "Flag an issue" button in the video editor after generating an AI description.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {entries.map((entry) => {
              const isExpanded = expanded === entry.id;
              const ratingColor = RATING_COLORS[entry.rating] ?? RATING_COLORS[3];
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-dark-600 bg-dark-800/40 overflow-hidden"
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-dark-700/30 transition-colors"
                  >
                    <StarRating rating={entry.rating} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.issueType && (
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${ratingColor}`}>
                            {ISSUE_LABELS[entry.issueType] ?? entry.issueType}
                          </span>
                        )}
                        {entry.videoTitle && (
                          <span className="text-xs text-text-muted truncate">{entry.videoTitle}</span>
                        )}
                        <span className="text-xs text-dark-400 ml-auto shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString()} · {entry.createdBy.name ?? entry.createdBy.email}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{entry.note}</p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-dark-700">
                      {entry.existingTags && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-3 mb-1">
                            Tags at time of generation
                          </p>
                          <p className="text-xs text-text-secondary">{entry.existingTags}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                          Admin's raw input
                        </p>
                        <p className="text-xs text-text-secondary leading-relaxed bg-dark-900/50 rounded-lg px-3 py-2">
                          <ExpandableText text={entry.rawInput} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                          AI output (canonicalDescription)
                        </p>
                        <p className="text-xs text-text-secondary leading-relaxed bg-dark-900/50 rounded-lg px-3 py-2">
                          <ExpandableText text={entry.aiOutput} />
                        </p>
                      </div>
                      {entry.aiSuggestedTags?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                            AI suggested tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.aiSuggestedTags.map((slug) => (
                              <span
                                key={slug}
                                className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono"
                              >
                                {slug}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.note && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Reviewer note
                          </p>
                          <p className="text-xs text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                            {entry.note}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => load(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-text-muted">
                {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => load(page + 1)}
                disabled={page === pages}
                className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
