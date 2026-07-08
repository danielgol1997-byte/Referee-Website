"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useSpeechInput, detectInputLanguage } from "@/lib/hooks/useSpeechInput";
import {
  GlobeIcon,
  SPEECH_LANGUAGE_OPTIONS,
  useSpeechLanguagePreference,
} from "@/lib/hooks/useSpeechLanguagePreference";

interface SearchDescriptionEditorProps {
  videoId: string;
  videoTitle?: string;
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
  onSuggestedTags?: (payload: {
    slugs: string[];
    rawDescription: string;
    canonicalDescription: string;
    searchSummary: string;
  }) => void;
}

export type SearchDescriptionEditorHandle = {
  /** Persist current editor fields as approved/indexed when needed (e.g. with Update Video). */
  commitApprovedWithCurrentEditorState: () => Promise<{
    ok: boolean;
    skipped?: boolean;
    error?: string;
  }>;
};

type SearchBaseline = {
  rawAdminDescription: string;
  canonicalSearchText: string;
  searchSummary: string;
  searchKeywords: string[];
  searchDescriptionStatus: string;
};

function normalizeKeywordsList(kw: string[] | undefined | null): string[] {
  return [...(kw ?? [])]
    .map((k) => k.trim())
    .filter(Boolean)
    .sort();
}

function baselineFromExisting(d: SearchDescriptionEditorProps["existingData"]): SearchBaseline {
  return {
    rawAdminDescription: d?.rawAdminDescription ?? "",
    canonicalSearchText: d?.canonicalSearchText ?? "",
    searchSummary: d?.searchSummary ?? "",
    searchKeywords: normalizeKeywordsList(d?.searchKeywords ?? []),
    searchDescriptionStatus: d?.searchDescriptionStatus ?? "none",
  };
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; pulse?: boolean }> = {
  none:         { label: "Not analyzed",   dot: "bg-dark-500" },
  analyzing:    { label: "Analyzing…",     dot: "bg-cyan-400", pulse: true },
  draft:        { label: "Draft",          dot: "bg-yellow-400" },
  ai_generated: { label: "Needs review",   dot: "bg-cyan-400" },
  approved:     { label: "Indexed",        dot: "bg-green-400" },
  failed:       { label: "Analysis failed", dot: "bg-red-400" },
};

/**
 * Compact mic + language-picker cluster backed by the Web Speech API.
 * Used for dictating the raw description and for speaking fix instructions.
 */
function MicCluster({
  contextText,
  onResult,
  onError,
}: {
  contextText: string;
  onResult: (text: string) => void;
  onError?: (err: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { preference, setPreference } = useSpeechLanguagePreference();
  const resolvedLang = preference === "auto" ? detectInputLanguage(contextText) : preference;
  const activeOption =
    SPEECH_LANGUAGE_OPTIONS.find((opt) => opt.value === preference) ||
    SPEECH_LANGUAGE_OPTIONS[0];

  const speech = useSpeechInput({
    lang: resolvedLang,
    append: true,
    onResult,
    onError,
  });

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (!speech.isSupported) return null;

  return (
    <div
      className={cn(
        "flex h-8 rounded-lg border bg-dark-900/90 shadow-sm shadow-black/25",
        speech.status === "listening" ? "border-red-500/50" : "border-dark-600"
      )}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        disabled={speech.status === "listening"}
        className={cn(
          "flex items-center gap-1 px-2 text-text-muted transition-colors rounded-l-lg",
          speech.status === "listening"
            ? "opacity-45 cursor-not-allowed"
            : "hover:bg-dark-800 hover:text-text-primary"
        )}
        aria-label="Voice input language"
        title={`Voice: ${activeOption.labelNative}`}
      >
        {preference === "auto" ? (
          <GlobeIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
        ) : (
          <span className="text-sm leading-none">{activeOption.flag}</span>
        )}
        <span className="text-[10px] font-semibold tabular-nums">{activeOption.abbr}</span>
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
      {showMenu && (
        <div className="absolute bottom-full right-0 mb-1.5 w-[min(17.5rem,calc(100vw-2rem))] rounded-xl border border-dark-600 bg-dark-900/96 backdrop-blur-md shadow-2xl z-50 p-1">
          {SPEECH_LANGUAGE_OPTIONS.map((opt) => {
            const selected = opt.value === preference;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPreference(opt.value);
                  setShowMenu(false);
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
  );
}

const Spinner = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

export const SearchDescriptionEditor = forwardRef<
  SearchDescriptionEditorHandle,
  SearchDescriptionEditorProps
>(function SearchDescriptionEditor(
  {
    videoId,
    videoTitle,
    videoUrl,
    explanationText,
    existingData,
    tags,
    onSuggestedTags,
  },
  ref
) {
  const hasData = !!(
    existingData?.rawAdminDescription ||
    existingData?.canonicalSearchText ||
    (existingData?.searchDescriptionStatus && existingData.searchDescriptionStatus !== "none")
  );

  const [isOpen, setIsOpen] = useState(hasData);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rawDescription, setRawDescription] = useState(existingData?.rawAdminDescription || "");
  const [canonicalText, setCanonicalText] = useState(existingData?.canonicalSearchText || "");
  const [searchSummary, setSearchSummary] = useState(existingData?.searchSummary || "");
  const [keywords, setKeywords] = useState<string[]>(existingData?.searchKeywords || []);
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState(existingData?.searchDescriptionStatus || "none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // "Fix with AI" bar
  const [fixInstruction, setFixInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  // Feedback state — snapshot of the last generation for attaching to a report
  const lastGenerationRef = useRef<{ rawInput: string; existingTags: string; aiOutput: string; aiSuggestedTags: string[] } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(3);
  const [feedbackIssueType, setFeedbackIssueType] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep a ref to existingData so the videoId-change effect always reads
  // the latest value without needing existingData in its own dependency array.
  // This prevents the effect from re-running every time the parent re-renders
  // with a new inline object reference (which would wipe unsaved AI content).
  const existingDataRef = useRef(existingData);
  existingDataRef.current = existingData;
  const prevVideoIdRef = useRef<string | null>(null);
  const lastPersistedRef = useRef<SearchBaseline | null>(null);
  const editorStateRef = useRef({
    rawDescription: "",
    canonicalText: "",
    searchSummary: "",
    keywords: [] as string[],
    status: "none",
  });
  editorStateRef.current = {
    rawDescription,
    canonicalText,
    searchSummary,
    keywords,
    status,
  };

  // Only re-initialise state when the video being edited changes.
  useEffect(() => {
    if (videoId !== prevVideoIdRef.current) {
      prevVideoIdRef.current = videoId;
      const d = existingDataRef.current;
      setRawDescription(d?.rawAdminDescription || "");
      setCanonicalText(d?.canonicalSearchText || "");
      setSearchSummary(d?.searchSummary || "");
      setKeywords(d?.searchKeywords || []);
      setStatus(d?.searchDescriptionStatus || "none");
      lastPersistedRef.current = baselineFromExisting(d);
      const shouldOpen = !!(
        d?.rawAdminDescription ||
        d?.canonicalSearchText ||
        (d?.searchDescriptionStatus && d.searchDescriptionStatus !== "none")
      );
      setIsOpen(shouldOpen);
    }
  }, [videoId]);

  // While a background analysis is running (auto-run on upload, or a bulk
  // re-index), poll the server until it finishes and load the result.
  useEffect(() => {
    if (status !== "analyzing") return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/library/videos/${videoId}/search-description`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const v = data?.video;
        if (!v || v.searchDescriptionStatus === "analyzing") return;
        setRawDescription(v.rawAdminDescription || "");
        setCanonicalText(v.canonicalSearchText || "");
        setSearchSummary(v.searchSummary || "");
        setKeywords(v.searchKeywords || []);
        setStatus(v.searchDescriptionStatus || "none");
        lastPersistedRef.current = {
          rawAdminDescription: v.rawAdminDescription || "",
          canonicalSearchText: v.canonicalSearchText || "",
          searchSummary: v.searchSummary || "",
          searchKeywords: normalizeKeywordsList(v.searchKeywords || []),
          searchDescriptionStatus: v.searchDescriptionStatus || "none",
        };
      } catch {
        // keep polling
      }
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, videoId]);

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
      const sugTags = Array.isArray(result.suggestedTags) ? result.suggestedTags : [];
      // Snapshot for potential feedback submission
      lastGenerationRef.current = {
        rawInput: rawDescription,
        existingTags: tags.map((t) => `[${t.category?.slug ?? ""}] ${t.name}`).join(", "),
        aiOutput: result.canonicalDescription || "",
        aiSuggestedTags: sugTags,
      };
      if (onSuggestedTags) {
        onSuggestedTags({
          slugs: sugTags,
          rawDescription,
          canonicalDescription: result.canonicalDescription || "",
          searchSummary: result.searchSummary || "",
        });
      }
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/library/videos/${videoId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const data = await res.json();

      setRawDescription(data.rawAdminDescription || "");
      setCanonicalText(data.canonicalSearchText || "");
      setSearchSummary(data.searchSummary || "");
      setKeywords(data.searchKeywords || []);
      setStatus(data.status || "ai_generated");
      // The route persisted everything server-side — sync the baseline so
      // Update Video doesn't redundantly re-save identical content.
      lastPersistedRef.current = {
        rawAdminDescription: data.rawAdminDescription || "",
        canonicalSearchText: data.canonicalSearchText || "",
        searchSummary: data.searchSummary || "",
        searchKeywords: normalizeKeywordsList(data.searchKeywords || []),
        searchDescriptionStatus: data.status || "ai_generated",
      };

      lastGenerationRef.current = {
        rawInput: data.rawAdminDescription || "",
        existingTags: tags.map((t) => `[${t.category?.slug ?? ""}] ${t.name}`).join(", "),
        aiOutput: data.canonicalSearchText || "",
        aiSuggestedTags: data.appliedTagSlugs || [],
      };
      setFeedbackSent(false);
      setShowFeedback(false);

      // Sync auto-applied tags into the parent form state so a later
      // "Update Video" save doesn't wipe them.
      const applied: string[] = Array.isArray(data.appliedTagSlugs) ? data.appliedTagSlugs : [];
      if (applied.length > 0 && onSuggestedTags) {
        onSuggestedTags({
          slugs: applied,
          rawDescription: data.rawAdminDescription || "",
          canonicalDescription: data.canonicalSearchText || "",
          searchSummary: data.searchSummary || "",
        });
      }

      if (data.warning) {
        setError(data.warning);
      } else {
        setSuccessMsg(
          data.indexed
            ? `Video analyzed and indexed for search.${applied.length > 0 ? ` ${applied.length} tag${applied.length === 1 ? "" : "s"} auto-added.` : ""}`
            : "Video analyzed — review the result below, then approve."
        );
      }
    } catch (err: any) {
      setError(err.message || "Video analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefine = async () => {
    const instruction = fixInstruction.trim();
    if (!instruction || !canonicalText.trim()) return;
    setIsRefining(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/admin/library/videos/${videoId}/search-description/refine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            canonicalText,
            searchSummary,
            searchKeywords: keywords,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setCanonicalText(data.canonicalDescription || canonicalText);
      setSearchSummary(data.searchSummary ?? searchSummary);
      if (Array.isArray(data.searchKeywords)) setKeywords(data.searchKeywords);
      setFixInstruction("");
      // The fix is applied locally only — needs approval to be re-indexed.
      if (status === "approved") setStatus("ai_generated");
      setSuccessMsg("Fix applied — review the updated text, then approve to re-index.");
    } catch (err: any) {
      setError(err.message || "Failed to apply the fix");
    } finally {
      setIsRefining(false);
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
      lastPersistedRef.current = {
        rawAdminDescription: rawDescription,
        canonicalSearchText: canonicalText,
        searchSummary,
        searchKeywords: [...keywords],
        searchDescriptionStatus: newStatus,
      };
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
      aiSuggestedTags: [] as string[],
    };
    if (!snap.aiOutput) return;
    setIsSendingFeedback(true);
    try {
      const res = await fetch("/api/admin/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          videoTitle: videoTitle || null,
          rawInput: snap.rawInput,
          existingTags: snap.existingTags,
          aiOutput: snap.aiOutput,
          aiSuggestedTags: snap.aiSuggestedTags,
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

  useImperativeHandle(ref, () => ({
    commitApprovedWithCurrentEditorState: async () => {
      const s = editorStateRef.current;
      if (!lastPersistedRef.current) {
        lastPersistedRef.current = baselineFromExisting(existingDataRef.current);
      }
      const baseline = lastPersistedRef.current;

      // Never interfere with a running background analysis.
      if (s.status === "analyzing") {
        return { ok: true, skipped: true };
      }

      const hasAnyContent = !!(
        s.rawDescription.trim() ||
        s.canonicalText.trim() ||
        s.searchSummary.trim() ||
        s.keywords.length > 0
      );
      if (!hasAnyContent && s.status === "none") {
        return { ok: true, skipped: true };
      }

      const kwDirty =
        JSON.stringify(normalizeKeywordsList(s.keywords)) !==
        JSON.stringify(normalizeKeywordsList(baseline.searchKeywords));
      const isDirty =
        s.rawDescription !== baseline.rawAdminDescription ||
        s.canonicalText !== baseline.canonicalSearchText ||
        s.searchSummary !== baseline.searchSummary ||
        kwDirty;

      const needsApproval = s.status !== "approved";

      if (!isDirty && !needsApproval) {
        return { ok: true, skipped: true };
      }

      try {
        const res = await fetch(`/api/admin/library/videos/${videoId}/search-description`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawAdminDescription: s.rawDescription,
            canonicalSearchText: s.canonicalText,
            searchSummary: s.searchSummary,
            searchKeywords: s.keywords,
            searchDescriptionStatus: "approved",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: (data as { error?: string }).error || `Error ${res.status}` };
        }
        setStatus("approved");
        lastPersistedRef.current = {
          rawAdminDescription: s.rawDescription,
          canonicalSearchText: s.canonicalText,
          searchSummary: s.searchSummary,
          searchKeywords: [...s.keywords],
          searchDescriptionStatus: "approved",
        };
        return { ok: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Request failed";
        return { ok: false, error: msg };
      }
    },
  }));

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const hasResult = !!canonicalText;
  const busy = isAnalyzing || isGenerating || isRefining;

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">AI Search Description</p>
            <p className="text-xs text-text-muted">auto-generated from the video — powers AI search</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot, statusCfg.pulse && "animate-pulse")} />
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

          {/* ── Background analysis in progress ── */}
          {(status === "analyzing" || isAnalyzing) && (
            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3">
              <Spinner className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-cyan-300">AI is analyzing this video…</p>
                <p className="text-xs text-text-muted">
                  Watching the clip, extracting facts, writing the search description. Usually 1–3 minutes — the result appears here automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── Failed banner ── */}
          {status === "failed" && !isAnalyzing && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-red-300">The last analysis failed.</p>
                <p className="text-xs text-text-muted">You can retry — nothing was lost.</p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={busy}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                Retry analysis
              </button>
            </div>
          )}

          {/* ── Empty state: not analyzed yet ── */}
          {!hasResult && status !== "analyzing" && status !== "failed" && !isAnalyzing && (
            <div className="rounded-xl border border-dashed border-dark-500 bg-dark-900/40 px-4 py-6 text-center space-y-3">
              <p className="text-sm text-text-muted">
                No AI description yet. The AI watches the clip, fills empty tags, writes the search description and indexes it — all automatically.
              </p>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Analyze Video
              </button>
            </div>
          )}

          {/* ── THE OUTPUT — the main thing the admin reviews and edits ── */}
          {hasResult && (
            <div className="border border-dark-600 rounded-xl p-4 space-y-3 bg-dark-900/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                  Search description — edit directly or tell the AI what to fix
                </p>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={busy || status === "analyzing"}
                  title="Run the full video analysis again from scratch (re-watches the clip)."
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dark-600 bg-dark-800 text-xs text-text-muted hover:text-text-primary hover:border-dark-500 transition-colors disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <Spinner className="w-3 h-3" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                  )}
                  Re-analyze video
                </button>
              </div>

              <textarea
                value={canonicalText}
                onChange={(e) => setCanonicalText(e.target.value)}
                rows={8}
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

              {/* ── Fix with AI: speak or type an instruction ── */}
              <div className="pt-2 border-t border-dark-700 space-y-1.5">
                <p className="text-[11px] text-text-muted">
                  Something wrong? Press the mic (or type) and say what to fix — e.g. &ldquo;the foul is outside the box, not inside&rdquo; or &ldquo;add that the goalkeeper got injured&rdquo;.
                </p>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={fixInstruction}
                      onChange={(e) => setFixInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleRefine(); }
                      }}
                      placeholder="Tell the AI what to fix…"
                      disabled={isRefining}
                      className="w-full rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary placeholder-text-muted px-3 py-2 pr-[6.5rem] focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 disabled:opacity-60"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <MicCluster
                        contextText={fixInstruction}
                        onResult={(text) =>
                          setFixInstruction((prev) => (prev.trim() ? prev + " " + text : text))
                        }
                        onError={(err) => setSpeechError(err)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefine}
                    disabled={isRefining || !fixInstruction.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all disabled:opacity-40"
                  >
                    {isRefining ? (
                      <>
                        <Spinner className="w-3.5 h-3.5" />
                        Fixing…
                      </>
                    ) : (
                      "Apply fix"
                    )}
                  </button>
                </div>
                {speechError && <p className="text-xs text-orange-400">{speechError}</p>}
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
          {hasResult && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isSaving || busy}
                className="px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-text-muted hover:text-text-primary hover:bg-dark-600 text-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => handleSave("approved")}
                disabled={isSaving || busy}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : status === "approved" ? "Re-index" : "Approve & Index"}
              </button>
              {status === "approved" && (
                <span className="text-xs text-green-400/80">Live in AI search</span>
              )}
            </div>
          )}

          {/* ── Advanced: source notes + text-only generation ── */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-90")} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Advanced: source notes &amp; tags ({tags.length})
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                {/* Current tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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

                {/* Source notes textarea + mic */}
                <div className="relative">
                  <textarea
                    value={rawDescription}
                    onChange={(e) => {
                      setRawDescription(e.target.value);
                      if (status === "none") setStatus("draft");
                    }}
                    placeholder="Optional source notes — extra details the AI should include (what happens, who's involved, colours, positions, decision)..."
                    rows={4}
                    className="w-full rounded-lg bg-dark-900 border border-dark-600 text-sm text-text-primary placeholder-text-muted px-4 py-3 pr-[7.25rem] resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-colors"
                  />
                  <div className="absolute bottom-3 right-3">
                    <MicCluster
                      contextText={rawDescription}
                      onResult={(text) => {
                        setRawDescription((prev) => (prev.trim() ? prev + " " + text : text));
                        if (status === "none") setStatus("draft");
                      }}
                      onError={(err) => setSpeechError(err)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || busy || !rawDescription.trim()}
                  title="Regenerate the description from the notes above WITHOUT re-watching the video (faster than a full re-analysis)."
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-sm text-text-muted hover:text-text-primary hover:bg-dark-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      Regenerate from notes only
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SearchDescriptionEditor.displayName = "SearchDescriptionEditor";
