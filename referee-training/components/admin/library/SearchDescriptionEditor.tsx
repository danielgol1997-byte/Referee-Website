"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSpeechInput } from "@/lib/hooks/useSpeechInput";

interface SearchDescriptionEditorProps {
  videoId: string;
  videoUrl?: string;
  explanationText?: string;
  existingData?: {
    rawAdminDescription?: string | null;
    canonicalSearchText?: string | null;
    searchSummary?: string | null;
    searchKeywords?: string[];
    searchDescriptionStatus?: string;
  };
  tags: Array<{
    name: string;
    category?: { name: string; slug: string } | null;
    isCorrectDecision?: boolean;
  }>;
  onSuggestedTags?: (slugs: string[]) => void;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  none:         { label: "Not started",     dot: "bg-dark-500" },
  draft:        { label: "Draft",           dot: "bg-yellow-400" },
  ai_generated: { label: "Needs review",   dot: "bg-cyan-400" },
  approved:     { label: "Indexed",         dot: "bg-green-400" },
};

export function SearchDescriptionEditor({
  videoId,
  videoUrl,
  explanationText,
  existingData,
  tags,
  onSuggestedTags,
}: SearchDescriptionEditorProps) {
  const hasData = !!(
    existingData?.rawAdminDescription ||
    existingData?.canonicalSearchText ||
    (existingData?.searchDescriptionStatus && existingData.searchDescriptionStatus !== "none")
  );

  const [isOpen, setIsOpen] = useState(hasData);
  const [showTags, setShowTags] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rawDescription, setRawDescription] = useState(existingData?.rawAdminDescription || "");
  const [canonicalText, setCanonicalText] = useState(existingData?.canonicalSearchText || "");
  const [searchSummary, setSearchSummary] = useState(existingData?.searchSummary || "");
  const [keywords, setKeywords] = useState<string[]>(existingData?.searchKeywords || []);
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState(existingData?.searchDescriptionStatus || "none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep a ref to existingData so the videoId-change effect always reads
  // the latest value without needing existingData in its own dependency array.
  // This prevents the effect from re-running every time the parent re-renders
  // with a new inline object reference (which would wipe unsaved AI content).
  const existingDataRef = useRef(existingData);
  existingDataRef.current = existingData;
  const prevVideoIdRef = useRef<string | null>(null);

  const speech = useSpeechInput({
    append: true,
    onResult: (text) => {
      setRawDescription((prev) => (prev.trim() ? prev + " " + text : text));
      if (status === "none") setStatus("draft");
    },
    onError: (err) => setSpeechError(err),
  });

  // Only re-initialise state when the video being edited changes.
  // Do NOT depend on `existingData` directly — the parent creates a new object
  // literal on every render, which would fire this effect on every tag add/remove
  // and silently wipe freshly generated AI content.
  useEffect(() => {
    if (videoId !== prevVideoIdRef.current) {
      prevVideoIdRef.current = videoId;
      const d = existingDataRef.current;
      setRawDescription(d?.rawAdminDescription || "");
      setCanonicalText(d?.canonicalSearchText || "");
      setSearchSummary(d?.searchSummary || "");
      setKeywords(d?.searchKeywords || []);
      setStatus(d?.searchDescriptionStatus || "none");
      const shouldOpen = !!(
        d?.rawAdminDescription ||
        d?.canonicalSearchText ||
        (d?.searchDescriptionStatus && d.searchDescriptionStatus !== "none")
      );
      setIsOpen(shouldOpen);
    }
  }, [videoId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/admin/library/videos/${videoId}/search-description/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawDescription, explanationText }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const data = await res.json();
      const result = data?.result;
      if (!result) {
        throw new Error("Invalid API response: missing result");
      }
      setCanonicalText(result.canonicalDescription || "");
      setSearchSummary(result.searchSummary || "");
      setKeywords(result.searchKeywords || []);
      setStatus("ai_generated");
      setSuccessMsg(null);
      const sugTags = Array.isArray(result.suggestedTags) ? result.suggestedTags : [];
      if (sugTags.length > 0 && onSuggestedTags) {
        onSuggestedTags(sugTags);
      }
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (newStatus: string) => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/admin/library/videos/${videoId}/search-description`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawAdminDescription: rawDescription,
            canonicalSearchText: canonicalText,
            searchSummary,
            searchKeywords: keywords,
            searchDescriptionStatus: newStatus,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      setStatus(newStatus);
      setSuccessMsg(newStatus === "approved" ? "Indexed for search." : "Draft saved.");
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const hasResult = !!(canonicalText || status === "ai_generated");

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800/40 overflow-hidden">

      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">Video Description</p>
            <p className="text-xs text-text-muted">for AI-powered filtering</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </span>
          <svg
            className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Body ── */}
      {isOpen && (
        <div className="border-t border-dark-600 p-5 space-y-4">

          {/* Video player */}
          {videoUrl && (
            <div className="relative rounded-xl overflow-hidden bg-black border border-dark-700">
              <video
                ref={videoRef}
                src={videoUrl}
                loop
                muted
                playsInline
                className="w-full max-h-52 object-contain"
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
              {/* Play / Pause overlay button */}
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center group"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <span className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  "bg-black/50 group-hover:bg-black/70 backdrop-blur-sm",
                  isPlaying && "opacity-0 group-hover:opacity-100"
                )}>
                  {isPlaying ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Tags — collapsed disclosure */}
          {tags.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTags((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className={cn("w-3 h-3 transition-transform", showTags && "rotate-90")} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Current tags ({tags.length})
              </button>
              {showTags && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs",
                        tag.isCorrectDecision
                          ? "bg-green-500/15 text-green-300 border border-green-500/25"
                          : "bg-dark-700 text-text-muted border border-dark-600"
                      )}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description textarea + mic */}
          <div className="relative">
            <textarea
              value={rawDescription}
              onChange={(e) => {
                setRawDescription(e.target.value);
                if (status === "none") setStatus("draft");
              }}
              placeholder="Describe the incident — what happens, who's involved, colours, positions, decision..."
              rows={4}
              className={cn(
                "w-full rounded-lg bg-dark-900 border text-sm text-text-primary placeholder-text-muted px-4 py-3 pr-10 resize-y focus:outline-none focus:ring-2 transition-colors",
                speech.status === "listening"
                  ? "border-red-500/50 ring-2 ring-red-500/20 focus:ring-red-500/30"
                  : "border-dark-600 focus:ring-purple-500/30 focus:border-purple-500/40"
              )}
            />
            {/* Mic button inside textarea corner */}
            {speech.isSupported && (
              <button
                type="button"
                onClick={speech.toggle}
                title={speech.status === "listening" ? "Stop" : "Dictate"}
                className={cn(
                  "absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  speech.status === "listening"
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-dark-700 text-text-muted hover:text-text-primary hover:bg-dark-600 border border-dark-600"
                )}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zm-7 9a7 7 0 0014 0h2a9 9 0 01-8 8.94V23h-2v-2.06A9 9 0 013 12H5z"/>
                </svg>
              </button>
            )}
          </div>
          {speechError && <p className="text-xs text-orange-400 -mt-2">{speechError}</p>}

          {/* Enhance button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !rawDescription.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Enhance with AI
              </>
            )}
          </button>

          {/* ── AI result ── */}
          {hasResult && (
            <div className="border border-dark-600 rounded-xl p-4 space-y-3 bg-dark-900/40">
              <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Generated — edit if needed, then approve
              </p>

              <textarea
                value={canonicalText}
                onChange={(e) => setCanonicalText(e.target.value)}
                rows={5}
                placeholder="Generated description..."
                className="w-full rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
              />

              <input
                type="text"
                value={searchSummary}
                onChange={(e) => setSearchSummary(e.target.value)}
                placeholder="One-line summary..."
                className="w-full rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
              />

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-dark-700 border border-dark-600 text-text-muted text-xs">
                      {kw}
                      <button type="button" onClick={() => setKeywords(keywords.filter((k) => k !== kw))} className="hover:text-red-400 transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); const kw = keywordInput.trim(); if (kw && !keywords.includes(kw)) { setKeywords([...keywords, kw]); setKeywordInput(""); } }
                  }}
                  placeholder="Add keyword..."
                  className="flex-1 rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
                <button type="button" onClick={() => { const kw = keywordInput.trim(); if (kw && !keywords.includes(kw)) { setKeywords([...keywords, kw]); setKeywordInput(""); } }} className="px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-600 text-text-muted hover:text-text-primary text-sm transition-colors">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Status messages */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          {successMsg && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{successMsg}</p>
          )}

          {/* Save row */}
          {(canonicalText || rawDescription) && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-text-muted hover:text-text-primary hover:bg-dark-600 text-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              {canonicalText && (
                <button
                  type="button"
                  onClick={() => handleSave("approved")}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Approve & Index"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
