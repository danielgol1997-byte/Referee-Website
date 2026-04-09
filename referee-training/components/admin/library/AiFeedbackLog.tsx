"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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

const ISSUE_OPTIONS = [
  { value: "", label: "Issue type (optional)" },
  { value: "hallucination", label: "Hallucination — invented detail" },
  { value: "embellishment", label: "Embellishment — language upgraded" },
  { value: "wrong_tag", label: "Wrong / missing tag suggested" },
  { value: "translation", label: "Translation error" },
  { value: "too_short", label: "Too short / missing detail" },
  { value: "other", label: "Other" },
];

const RATING_COLORS: Record<number, string> = {
  1: "text-red-400 bg-red-500/10 border-red-500/20",
  2: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  3: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  4: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  5: "text-green-400 bg-green-500/10 border-green-500/20",
};

function StarRating({
  rating,
  interactive,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  return (
    <span className="flex gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={`w-4 h-4 transition-colors ${n <= rating ? "text-amber-400" : "text-dark-600"} ${interactive ? "hover:text-amber-300 cursor-pointer" : "cursor-default"}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

function ExpandableText({ text, maxLen = 250 }: { text: string; maxLen?: number }) {
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
  const { data: session } = useSession();
  const isDev = (session?.user as any)?.role === "DEVELOPER";

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Per-entry edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(3);
  const [editIssueType, setEditIssueType] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Per-entry delete state
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => { load(1); }, [load]);

  const startEdit = (entry: FeedbackEntry) => {
    setEditing(entry.id);
    setEditRating(entry.rating);
    setEditIssueType(entry.issueType ?? "");
    setEditNote(entry.note ?? "");
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/ai-feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, issueType: editIssueType || null, note: editNote || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, rating: editRating, issueType: editIssueType || null, note: editNote || null } : e
        )
      );
      setEditing(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const doDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/ai-feedback/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => t - 1);
      setConfirmDelete(null);
      if (expanded === id) setExpanded(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

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
            {total} report{total !== 1 ? "s" : ""} — review to improve the AI prompt
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
              const isEditing = editing === entry.id;
              const ratingColor = RATING_COLORS[entry.rating] ?? RATING_COLORS[3];

              return (
                <div key={entry.id} className="rounded-xl border border-dark-600 bg-dark-800/40 overflow-hidden">
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => !isEditing && setExpanded(isExpanded ? null : entry.id)}
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
                    <svg className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-dark-700">
                      {/* Developer action bar */}
                      {isDev && (
                        <div className="flex items-center gap-2 pt-3">
                          {isEditing ? (
                            <>
                              <StarRating rating={editRating} interactive onChange={setEditRating} />
                              <select
                                value={editIssueType}
                                onChange={(e) => setEditIssueType(e.target.value)}
                                className="rounded-lg bg-dark-900 border border-dark-600 text-xs text-text-primary px-2 py-1 focus:outline-none"
                              >
                                {ISSUE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                              <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                rows={1}
                                placeholder="Note…"
                                className="flex-1 rounded-lg bg-dark-900 border border-dark-600 text-xs text-text-primary px-2 py-1 resize-none focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveEdit(entry.id)}
                                disabled={isSaving}
                                className="px-3 py-1 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-xs hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
                              >
                                {isSaving ? "…" : "Save"}
                              </button>
                              <button type="button" onClick={cancelEdit} className="px-2 py-1 text-text-muted text-xs hover:text-text-primary transition-colors">
                                Cancel
                              </button>
                            </>
                          ) : confirmDelete === entry.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400">Delete this entry?</span>
                              <button
                                type="button"
                                onClick={() => doDelete(entry.id)}
                                disabled={isDeleting}
                                className="px-3 py-1 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? "…" : "Yes, delete"}
                              </button>
                              <button type="button" onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-text-muted text-xs hover:text-text-primary transition-colors">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(entry.id)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 text-xs transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Content fields */}
                      {entry.existingTags && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-2 mb-1">Tags at time of generation</p>
                          <p className="text-xs text-text-secondary">{entry.existingTags}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Admin's raw input</p>
                        <p className="text-xs text-text-secondary leading-relaxed bg-dark-900/50 rounded-lg px-3 py-2">
                          <ExpandableText text={entry.rawInput} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">AI output (canonicalDescription)</p>
                        <p className="text-xs text-text-secondary leading-relaxed bg-dark-900/50 rounded-lg px-3 py-2">
                          <ExpandableText text={entry.aiOutput} />
                        </p>
                      </div>
                      {entry.aiSuggestedTags?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">AI suggested tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.aiSuggestedTags.map((slug) => (
                              <span key={slug} className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono">
                                {slug}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.note && !isEditing && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Reviewer note</p>
                          <p className="text-xs text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">{entry.note}</p>
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
              <button type="button" onClick={() => load(page - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors">
                ← Prev
              </button>
              <span className="text-xs text-text-muted">{page} / {pages}</span>
              <button type="button" onClick={() => load(page + 1)} disabled={page === pages} className="px-3 py-1.5 rounded-lg border border-dark-600 text-text-muted hover:text-text-primary text-xs disabled:opacity-40 transition-colors">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
