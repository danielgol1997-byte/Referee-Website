"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSpeechInput, detectInputLanguage } from "@/lib/hooks/useSpeechInput";
import {
  GlobeIcon,
  SPEECH_LANGUAGE_OPTIONS,
  useSpeechLanguagePreference,
} from "@/lib/hooks/useSpeechLanguagePreference";

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
  // Feedback state — snapshot of the last generation for attaching to a report
  const lastGenerationRef = useRef<{ rawInput: string; existingTags: string; aiOutput: string } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(3);
  const [feedbackIssueType, setFeedbackIssueType] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showSpeechLangMenu, setShowSpeechLangMenu] = useState(false);
  const speechLangRef = useRef<HTMLDivElement>(null);
  const { preference: speechLangPref, setPreference: setSpeechLangPref } =
    useSpeechLanguagePreference();
  const resolvedSpeechLang =
    speechLangPref === "auto" ? detectInputLanguage(rawDescription) : speechLangPref;
  const activeSpeechOption =
    SPEECH_LANGUAGE_OPTIONS.find((opt) => opt.value === speechLangPref) ||
    SPEECH_LANGUAGE_OPTIONS[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep a ref to existingData so the videoId-change effect always reads
  // the latest value without needing existingData in its own dependency array.
  // This prevents the effect from re-running every time the parent re-renders
  // with a new inline object reference (which would wipe unsaved AI content).
  const existingDataRef = useRef(existingData);
  existingDataRef.current = existingData;
  const prevVideoIdRef = useRef<string | null>(null);

  const speech = useSpeechInput({
    lang: resolvedSpeechLang,
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

  useEffect(() => {
    function handleOutsideSpeechLang(event: MouseEvent) {
      if (
        speechLangRef.current &&
        !speechLangRef.current.contains(event.target as Node)
      ) {
        setShowSpeechLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideSpeechLang);
    return () => document.removeEventListener("mousedown", handleOutsideSpeechLang);
  }, []);

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
      setFeedbackSent(false);
      setShowFeedback(false);
      // Snapshot for potential feedback submission
      lastGenerationRef.current = {
        rawInput: rawDescription,
        existingTags: tags.map((t) => `[${t.category?.slug ?? ""}] ${t.name}`).join(", "),
        aiOutput: result.canonicalDescription || "",
      };
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

  const handleFeedback = async () => {
    // Use the snapshot captured at generation time, or fall back to current
    // state values so feedback works even on existing (pre-loaded) AI content.
    const snap = lastGenerationRef.current ?? {
      rawInput: rawDescription,
      existingTags: tags.map((t) => `[${t.category?.slug ?? ""}] ${t.name}`).join(", "),
      aiOutput: canonicalText,
    };
    if (!snap.aiOutput) return;
    setIsSendingFeedback(true);
    try {
      const res = await fetch("/api/admin/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          rawInput: snap.rawInput,
          existingTags: snap.existingTags,
          aiOutput: snap.aiOutput,
          rating: feedbackRating,
          issueType: feedbackIssueType || null,
          note: feedbackNote || null,
        }),
      });
      if (res.ok) {
        setFeedbackSent(true);
        setShowFeedback(false);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Feedback error:", data);
      }
    } catch (err) {
      console.error("Feedback submit failed:", err);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const hasResult = !!(canonicalText || status === "ai_generated");

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800/40">

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
                "w-full rounded-lg bg-dark-900 border text-sm text-text-primary placeholder-text-muted px-4 py-3 pr-[7.25rem] resize-y focus:outline-none focus:ring-2 transition-colors",
                speech.status === "listening"
                  ? "border-red-500/50 ring-2 ring-red-500/20 focus:ring-red-500/30"
                  : "border-dark-600 focus:ring-purple-500/30 focus:border-purple-500/40"
              )}
            />
            {speech.isSupported && (
              <div
                className="absolute bottom-3 right-3 flex h-8 rounded-lg border border-dark-600 bg-dark-900/90 shadow-sm shadow-black/25"
                ref={speechLangRef}
              >
                <button
                  type="button"
                  onClick={() => setShowSpeechLangMenu((v) => !v)}
                  disabled={speech.status === "listening"}
                  className={cn(
                    "flex items-center gap-1 px-2 text-text-muted transition-colors rounded-l-lg",
                    speech.status === "listening"
                      ? "opacity-45 cursor-not-allowed"
                      : "hover:bg-dark-800 hover:text-text-primary"
                  )}
                  aria-label="Voice input language"
                  title={`Voice: ${activeSpeechOption.labelNative}`}
                >
                  {speechLangPref === "auto" ? (
                    <GlobeIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                  ) : (
                    <span className="text-sm leading-none">{activeSpeechOption.flag}</span>
                  )}
                  <span className="text-[10px] font-semibold tabular-nums">{activeSpeechOption.abbr}</span>
                  <svg className="w-2.5 h-2.5 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="w-px self-stretch bg-dark-600" aria-hidden />
                <button
                  type="button"
                  onClick={speech.toggle}
                  title={speech.status === "listening" ? "Stop" : "Dictate"}
                  className={cn(
                    "flex items-center justify-center px-2.5 transition-colors rounded-r-lg",
                    speech.status === "listening"
                      ? "bg-red-500/20 text-red-400"
                      : "text-text-muted hover:bg-dark-800 hover:text-text-primary"
                  )}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zm-7 9a7 7 0 0014 0h2a9 9 0 01-8 8.94V23h-2v-2.06A9 9 0 013 12H5z"/>
                  </svg>
                </button>
                {showSpeechLangMenu && (
                  <div className="absolute bottom-full right-0 mb-1.5 w-[min(17.5rem,calc(100vw-2rem))] rounded-xl border border-dark-600 bg-dark-900/96 backdrop-blur-md shadow-2xl z-50 p-1">
                    {SPEECH_LANGUAGE_OPTIONS.map((opt) => {
                      const selected = opt.value === speechLangPref;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSpeechLangPref(opt.value);
                            setShowSpeechLangMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                            selected
                              ? "bg-purple-500/15 text-purple-200"
                              : "text-text-muted hover:bg-dark-800 hover:text-text-primary"
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {opt.value === "auto" ? (
                              <GlobeIcon className="w-4 h-4 shrink-0 opacity-85" />
                            ) : (
                              <span className="text-base leading-none shrink-0">{opt.flag}</span>
                            )}
                            <span className="text-xs truncate">{opt.labelNative}</span>
                          </span>
                          <span className="text-[10px] font-semibold opacity-80 tabular-nums shrink-0">{opt.abbr}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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

              {/* ── Feedback row ── */}
              <div className="pt-1 border-t border-dark-700">
                {feedbackSent ? (
                  <p className="text-xs text-green-400">Feedback recorded — thank you.</p>
                ) : showFeedback ? (
                  <div className="space-y-2">
                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeedbackRating(n)}
                          className={cn("w-6 h-6 transition-colors", n <= feedbackRating ? "text-amber-400" : "text-dark-500 hover:text-amber-300")}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"/></svg>
                        </button>
                      ))}
                      <span className="text-xs text-text-muted ml-1">{feedbackRating === 5 ? "Great" : feedbackRating === 4 ? "Good" : feedbackRating === 3 ? "OK" : feedbackRating === 2 ? "Issues" : "Wrong"}</span>
                    </div>
                    {/* Issue type */}
                    <select
                      value={feedbackIssueType}
                      onChange={(e) => setFeedbackIssueType(e.target.value)}
                      className="w-full rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">Issue type (optional)</option>
                      <option value="hallucination">Hallucination — invented detail</option>
                      <option value="embellishment">Embellishment — language upgraded</option>
                      <option value="wrong_tag">Wrong / missing tag suggested</option>
                      <option value="translation">Translation error</option>
                      <option value="too_short">Too short / missing detail</option>
                      <option value="other">Other</option>
                    </select>
                    {/* Note */}
                    <textarea
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      rows={2}
                      placeholder="What was wrong? (optional but helpful)"
                      className="w-full rounded-lg bg-dark-900 border border-dark-600 text-xs text-text-primary px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleFeedback}
                        disabled={isSendingFeedback}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                      >
                        {isSendingFeedback ? "Sending…" : "Submit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFeedback(false)}
                        className="px-3 py-1.5 rounded-lg text-text-muted text-xs hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFeedback(true)}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-amber-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Flag an issue with this output
                  </button>
                )}
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
