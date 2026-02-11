"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { VideoTestAnswerOverlay, type VideoTestAnswerValue } from "./VideoTestAnswerOverlay";

type Clip = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  playOn?: boolean;
  noOffence?: boolean;
  loopZoneStart?: number;
  loopZoneEnd?: number;
  decisionExplanation?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  varNotes?: string;
  isEducational?: boolean;
  lawNumbers?: number[];
  tags?: Array<{
    id: string;
    slug: string;
    name: string;
    category: { id: string; name: string; slug: string; canBeCorrectAnswer: boolean } | null;
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
};

type TagOptions = {
  restarts: { id: string; slug: string; name: string }[];
  sanction: { id: string; slug: string; name: string }[];
  criteria: { id: string; slug: string; name: string }[];
};

const emptyAnswer: VideoTestAnswerValue = {
  playOnNoOffence: false,
  restartTagId: null,
  sanctionTagId: null,
  criteriaTagIds: [],
};

export function VideoTestRunner({
  sessionId,
  resultsHref,
}: {
  sessionId: string;
  resultsHref: string;
}) {
  const router = useRouter();
  const [clips, setClips] = useState<Clip[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOptions>({ restarts: [], sanction: [], criteria: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, VideoTestAnswerValue>>({});
  const [viewUsage, setViewUsage] = useState<Record<string, number>>({});
  const [maxViewsPerClip, setMaxViewsPerClip] = useState<number | null>(null);
  const [showAnswerOverlay, setShowAnswerOverlay] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConsumingView, setIsConsumingView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tests/videos/${sessionId}/clips`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setClips(data.clips ?? []);
        setTagOptions(data.tagOptions ?? { restarts: [], sanction: [], criteria: [] });
        // 0 or null means unlimited; only positive numbers are actual limits
        setMaxViewsPerClip(
          typeof data.maxViewsPerClip === "number" && data.maxViewsPerClip > 0
            ? data.maxViewsPerClip
            : null
        );
        const rawCounts = (data.clipViewCounts ?? {}) as Record<string, unknown>;
        const parsedCounts: Record<string, number> = {};
        for (const [clipId, count] of Object.entries(rawCounts)) {
          if (typeof count === "number" && Number.isFinite(count)) {
            parsedCounts[clipId] = count;
          }
        }
        setViewUsage(parsedCounts);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load clips");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  const currentClip = clips[currentIndex] ?? null;
  const currentClipUsedViews = currentClip ? viewUsage[currentClip.id] ?? 0 : 0;
  const hasViewLimit = maxViewsPerClip !== null;
  const remainingViews = useMemo(() => {
    if (!currentClip || maxViewsPerClip === null) return null;
    return Math.max(maxViewsPerClip - currentClipUsedViews, 0);
  }, [currentClip, currentClipUsedViews, maxViewsPerClip]);
  const viewsExhausted = hasViewLimit && remainingViews !== null && remainingViews <= 0;
  const currentAnswer = currentClip ? answers[currentClip.id] ?? emptyAnswer : emptyAnswer;
  // A clip is fully answered when EITHER play-on is checked OR all three fields are set
  const isFullyAnswered = (a: VideoTestAnswerValue | undefined): boolean => {
    if (!a) return false;
    if (a.playOnNoOffence) return true;
    return a.restartTagId !== null && a.sanctionTagId !== null && a.criteriaTagIds.length > 0;
  };
  // Partially answered = at least one field set but not all three
  const isPartiallyAnswered = (a: VideoTestAnswerValue | undefined): boolean => {
    if (!a) return false;
    if (a.playOnNoOffence) return false; // play-on = fully answered
    const filled = [a.restartTagId !== null, a.sanctionTagId !== null, a.criteriaTagIds.length > 0].filter(Boolean).length;
    return filled > 0 && filled < 3;
  };
  const answeredCount = clips.filter((c) => isFullyAnswered(answers[c.id])).length;
  const allAnswered = clips.length > 0 && answeredCount === clips.length;
  const progressPercent = clips.length > 0 ? (answeredCount / clips.length) * 100 : 0;

  const setCurrentAnswer = (value: VideoTestAnswerValue) => {
    if (!currentClip) return;
    setAnswers((prev) => ({ ...prev, [currentClip.id]: value }));
  };

  const stopPlayback = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    stopPlayback();
    setShowAnswerOverlay(false);
  }, [currentIndex, stopPlayback]);

  const startPlayback = async () => {
    if (!currentClip || isConsumingView || isPlaying) return;

    if (maxViewsPerClip === null) {
      // Unlimited views — just play
      if (!videoRef.current) return;
      videoRef.current.currentTime = 0;
      await videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    if (viewsExhausted) return;

    setIsConsumingView(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/videos/${sessionId}/consume-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoClipId: currentClip.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start clip");
      if (!data?.allowed) return;
      setViewUsage((prev) => ({
        ...prev,
        [currentClip.id]:
          typeof data.used === "number" ? data.used : (prev[currentClip.id] ?? 0) + 1,
      }));
      if (!videoRef.current) return;
      videoRef.current.currentTime = 0;
      await videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start clip");
    } finally {
      setIsConsumingView(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const answersList = clips.map((c) => {
        const a = answers[c.id] ?? emptyAnswer;
        return {
          videoClipId: c.id,
          playOnNoOffence: a.playOnNoOffence,
          restartTagId: a.restartTagId,
          sanctionTagId: a.sanctionTagId,
          criteriaTagIds: a.criteriaTagIds,
        };
      });
      const res = await fetch(`/api/tests/videos/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit");
      router.push(resultsHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate to next clip (stops current playback)
  const goNext = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !showConfirmation && !isPlaying) {
    return (
      <div className="p-6 rounded-lg bg-status-dangerBg border border-status-danger/30">
        <p className="text-sm text-status-danger">{error}</p>
      </div>
    );
  }

  if (!currentClip || clips.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No clips in this test.</p>
      </div>
    );
  }

  // Play button disabled state
  const playDisabled = isConsumingView || isPlaying || viewsExhausted;

  // Build play button label with view info baked in
  let playLabel: React.ReactNode;
  if (isConsumingView) {
    playLabel = (
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
        Starting…
      </span>
    );
  } else if (isPlaying) {
    playLabel = (
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dark-900/60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-dark-900" />
        </span>
        Playing…
      </span>
    );
  } else if (viewsExhausted) {
    playLabel = "No views left";
  } else {
    playLabel = "Play clip";
  }

  return (
    <div className="space-y-4 relative">
      {/* ─── Header: title + answered counter ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Video {currentIndex + 1} <span className="text-text-secondary font-normal text-lg">/ {clips.length}</span>
        </h2>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="tabular-nums font-semibold text-white">{answeredCount}</span>
          <span>of</span>
          <span className="tabular-nums font-semibold text-white">{clips.length}</span>
          <span>answered</span>
        </div>
      </div>

      {/* ─── Video player card ─── */}
      <div className="rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden shadow-xl">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            src={currentClip.fileUrl}
            poster={currentClip.thumbnailUrl}
            preload="metadata"
            controls={false}
            className="h-full w-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* ─── Controls bar ─── */}
        <div className="border-t border-dark-600 bg-dark-900/80 px-4 py-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Play button with view-limit ring */}
            <div className="relative">
              <button
                type="button"
                onClick={startPlayback}
                disabled={playDisabled}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200",
                  viewsExhausted
                    ? "bg-dark-700 text-text-secondary border border-dark-600 cursor-not-allowed"
                    : isPlaying
                      ? "bg-accent/20 text-accent border border-accent/40 cursor-default"
                      : "bg-gradient-to-r from-accent via-cyan-400 to-accent text-dark-900 hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]",
                  (isConsumingView) && "opacity-70 cursor-not-allowed"
                )}
              >
                {/* Play icon */}
                {!isPlaying && !isConsumingView && !viewsExhausted && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                {playLabel}
                {/* Views badge — only when there IS a view limit */}
                {hasViewLimit && !viewsExhausted && !isPlaying && (
                  <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-dark-900/40 text-[11px] font-bold tabular-nums">
                    {remainingViews}
                  </span>
                )}
              </button>

              {/* Circular view-limit ring around the button */}
              {hasViewLimit && maxViewsPerClip !== null && maxViewsPerClip > 0 && (
                <div className="absolute -inset-[3px] rounded-xl pointer-events-none overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect
                      x="1" y="1" width="98" height="98" rx="12" ry="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={cn(
                        "transition-all duration-500",
                        viewsExhausted ? "text-status-danger/40" : "text-accent/30"
                      )}
                      strokeDasharray={`${((currentClipUsedViews / maxViewsPerClip) * 392)} 392`}
                    />
                  </svg>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { stopPlayback(); setShowAnswerOverlay(true); }}
              className={cn(
                "px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200",
                "bg-dark-700 text-white border border-dark-600 hover:border-accent/50 hover:bg-dark-600"
              )}
            >
              Answer question
            </button>

            {/* Nav arrows */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-lg bg-dark-700 border border-dark-600 text-text-secondary hover:text-white hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                title="Previous clip"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex === clips.length - 1}
                className="p-2.5 rounded-lg bg-dark-700 border border-dark-600 text-text-secondary hover:text-white hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                title="Next clip"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/practice")}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-dark-600 hover:text-white hover:border-accent/40 transition-all duration-200"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* ─── Progress bar — under video, above clip index ─── */}
      <div className="space-y-1 mb-1">
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-accent to-cyan-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-text-secondary tabular-nums px-0.5">
          <span>{answeredCount} answered</span>
          <span>{clips.length - answeredCount} remaining</span>
        </div>
      </div>

      {/* ─── Clip index — centered ─── */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 overflow-visible pt-2 pb-1 max-w-full px-2 justify-center flex-wrap">
          {clips.map((clip, idx) => {
            const a = answers[clip.id];
            const full = isFullyAnswered(a);
            const partial = isPartiallyAnswered(a);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "relative flex-shrink-0 w-11 h-11 rounded-xl text-sm font-bold transition-all duration-200",
                  isCurrent
                    ? "bg-accent text-dark-900 shadow-lg shadow-accent/30 scale-110"
                    : full
                      ? "bg-accent/15 text-accent border-2 border-accent/60 hover:border-accent hover:bg-accent/25"
                      : partial
                        ? "bg-amber-500/10 text-amber-400 border-2 border-amber-500/50 hover:border-amber-400"
                        : "bg-dark-800 text-text-secondary border-2 border-dark-600 hover:border-accent/30"
                )}
              >
                {idx + 1}
                {/* Fully answered — checkmark badge */}
                {full && !isCurrent && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-accent shadow-sm shadow-accent/40" style={{ width: 18, height: 18 }}>
                    <svg className="w-2.5 h-2.5 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {/* Partially answered — dot badge */}
                {partial && !isCurrent && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40" style={{ width: 14, height: 14 }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-900" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Submit / Confirmation — centered under clip index */}
        <div className="flex items-center justify-center">
          {allAnswered && !showConfirmation && (
            <div
              onClick={() => { if (!submitting) setShowConfirmation(true); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer select-none",
                "bg-gradient-to-r from-accent via-cyan-400 to-accent",
                "hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02]",
                "active:scale-[0.98]",
                "transition-all duration-200",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              <svg className="w-4 h-4 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-dark-900 font-semibold text-sm">Submit Test</span>
            </div>
          )}
          {showConfirmation && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={() => { setShowConfirmation(false); setError(null); }}
                disabled={submitting}
                className={cn(
                  "px-4 py-2.5 rounded-lg font-semibold text-sm",
                  "bg-dark-700 text-white border-2 border-dark-600",
                  "hover:border-accent/50 hover:bg-dark-600",
                  "active:scale-[0.97]",
                  "transition-all duration-200",
                  "shadow-lg",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm",
                  "bg-gradient-to-r from-accent via-cyan-400 to-accent",
                  "text-dark-900",
                  "hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02]",
                  "active:scale-[0.97]",
                  "transition-all duration-200",
                  "shadow-lg shadow-accent/20",
                  submitting && "opacity-60 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  "Yes, submit"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submission error inline */}
      {error && showConfirmation && (
        <div className="rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-2.5 animate-in fade-in duration-200">
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}

      {/* Answer overlay */}
      {showAnswerOverlay && (
        <VideoTestAnswerOverlay
          isOpen={true}
          onClose={() => setShowAnswerOverlay(false)}
          tagOptions={tagOptions}
          value={currentAnswer}
          onChange={setCurrentAnswer}
        />
      )}
    </div>
  );
}
