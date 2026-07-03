"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useModal } from "@/components/ui/modal";

type Clip = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
};

type ArAnswer = "OFFSIDE" | "ONSIDE";

export function ArTestRunner({
  sessionId,
  resultsHref,
}: {
  sessionId: string;
  resultsHref: string;
}) {
  const router = useRouter();
  const modal = useModal();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ArAnswer>>({});
  const [showDecision, setShowDecision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isNavigatingToResults, setIsNavigatingToResults] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const decisionShownAtRef = useRef<number | null>(null);
  const answersRef = useRef<Record<string, ArAnswer>>({});
  const answerTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tests/ar/${sessionId}/clips`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        if (data.isCompleted) {
          router.replace(resultsHref);
          return;
        }
        setClips(data.clips ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load clips");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sessionId, router, resultsHref]);

  const currentClip = clips[currentIndex] ?? null;
  const answeredCount = clips.filter((c) => answers[c.id]).length;
  const progressPercent = clips.length > 0 ? (answeredCount / clips.length) * 100 : 0;

  const stopPlayback = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedVolume = window.localStorage.getItem("video-test-volume");
    const savedMuted = window.localStorage.getItem("video-test-muted");
    if (savedVolume !== null) {
      const parsed = Number(savedVolume);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) setVolume(parsed);
    }
    if (savedMuted !== null) setMuted(savedMuted === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("video-test-volume", String(volume));
  }, [volume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("video-test-muted", String(muted));
  }, [muted]);

  // 3-second countdown, then single auto-play of the current clip
  useEffect(() => {
    if (!currentClip) return;
    stopPlayback();
    setShowDecision(false);
    decisionShownAtRef.current = null;
    setCountdown(3);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            void videoRef.current.play().catch(() => {});
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [currentIndex, currentClip, stopPlayback]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = muted;
  }, [volume, muted, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target?.isContentEditable) return;
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setMuted((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const submitAnswers = async (): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      const answersList = clips
        .filter((c) => answersRef.current[c.id])
        .map((c) => ({
          arClipId: c.id,
          answer: answersRef.current[c.id],
          timeToAnswerMs: answerTimesRef.current[c.id] ?? null,
        }));
      const res = await fetch(`/api/tests/ar/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (decision: ArAnswer) => {
    if (!currentClip || submitting) return;
    if (answers[currentClip.id]) return;

    const elapsed = decisionShownAtRef.current
      ? Math.max(Date.now() - decisionShownAtRef.current, 0)
      : 0;
    answersRef.current = { ...answersRef.current, [currentClip.id]: decision };
    answerTimesRef.current = { ...answerTimesRef.current, [currentClip.id]: elapsed };
    setAnswers((prev) => ({ ...prev, [currentClip.id]: decision }));

    if (currentIndex === clips.length - 1) {
      setShowDecision(false);
      setIsNavigatingToResults(true);
      const submitScreenStartedAt = Date.now();
      const submitted = await submitAnswers();
      if (!submitted) {
        setIsNavigatingToResults(false);
        return;
      }
      const elapsedMs = Date.now() - submitScreenStartedAt;
      const remainingMs = Math.max(3000 - elapsedMs, 0);
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
      }
      router.push(resultsHref);
      return;
    }
    setShowDecision(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleExit = async () => {
    const confirmed = await modal.showConfirm(
      "Are you sure you want to exit? This attempt will be discarded.",
      "Exit Test",
      "warning"
    );
    if (!confirmed) return;
    router.push("/practice/ar");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !showDecision) {
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

  if (isNavigatingToResults) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-cyan-500/30 bg-dark-800/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
          <h2 className="text-xl font-bold text-white">Test submitted</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Please wait while we calculate your final result.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-7.5rem)] flex-col gap-3 overflow-hidden">
      {/* ─── Header: title + controls ─── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white drop-shadow">
          Clip {currentIndex + 1} <span className="text-text-secondary font-normal text-lg">/ {clips.length}</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800/90 px-3 py-1.5">
            <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {muted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6h4l5 5V4l-5 5H9zm11 0l-5 6m0-6l5 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6h4l5 5V4l-5 5H9z" />
              )}
            </svg>
            <button
              type="button"
              onClick={() => setMuted((prev) => !prev)}
              className="rounded border border-dark-500 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:text-white"
              title="Mute/unmute (M)"
              aria-label="Mute/unmute (M)"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                if (next > 0 && muted) setMuted(false);
              }}
              className="w-28 accent-cyan-400"
              aria-label="Volume"
            />
            <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-text-muted">
              {muted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary border border-dark-600 hover:text-white hover:border-accent/40 transition-all duration-200"
          >
            Exit test
          </button>
        </div>
      </div>

      {/* ─── Video player card ─── */}
      <div className="flex-1 rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden shadow-xl">
        <div className="relative h-full bg-black">
          <video
            ref={videoRef}
            src={currentClip.fileUrl}
            poster={currentClip.thumbnailUrl}
            preload="auto"
            controls={false}
            playsInline
            className="h-full w-full object-contain select-none"
            onEnded={() => {
              if (!currentClip || answers[currentClip.id]) return;
              decisionShownAtRef.current = Date.now();
              setShowDecision(true);
            }}
          />

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="rounded-full border border-cyan-300/60 bg-dark-900/85 px-8 py-5 text-5xl font-black text-cyan-300 shadow-2xl animate-in zoom-in-95 duration-200">
                {countdown}
              </div>
            </div>
          )}

          {/* Decision overlay — appears when the clip ends */}
          {showDecision && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300 px-4">
              <p className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-white drop-shadow">
                Make your call
              </p>
              <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision("OFFSIDE")}
                  className={cn(
                    "flex-1 rounded-2xl border-2 border-[#ef4444] bg-[#ef4444]/15 px-8 py-6",
                    "text-2xl md:text-3xl font-black uppercase tracking-wider text-[#ef4444]",
                    "shadow-lg shadow-[#ef4444]/20 transition-all duration-150",
                    "hover:bg-[#ef4444]/30 hover:shadow-xl hover:shadow-[#ef4444]/30 hover:scale-[1.02]",
                    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
                    "disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  Offside
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision("ONSIDE")}
                  className={cn(
                    "flex-1 rounded-2xl border-2 border-[#22c55e] bg-[#22c55e]/15 px-8 py-6",
                    "text-2xl md:text-3xl font-black uppercase tracking-wider text-[#22c55e]",
                    "shadow-lg shadow-[#22c55e]/20 transition-all duration-150",
                    "hover:bg-[#22c55e]/30 hover:shadow-xl hover:shadow-[#22c55e]/30 hover:scale-[1.02]",
                    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/70",
                    "disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  Onside
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Progress bar ─── */}
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

      {/* ─── Clip index ─── */}
      <div className="flex items-center gap-2 overflow-visible pt-2 pb-1 max-w-full px-2 justify-center flex-wrap">
        {clips.map((clip, idx) => {
          const answered = Boolean(answers[clip.id]);
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={clip.id}
              className={cn(
                "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold leading-none tabular-nums transition-all duration-200",
                isCurrent
                  ? "bg-accent text-dark-900 shadow-lg shadow-accent/30 scale-110"
                  : answered
                    ? "bg-accent/15 text-accent border-2 border-accent/60"
                    : "bg-dark-800 text-text-secondary border-2 border-dark-600"
              )}
            >
              {idx + 1}
              {answered && !isCurrent && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-accent shadow-sm shadow-accent/40" style={{ width: 18, height: 18 }}>
                  <svg className="w-2.5 h-2.5 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Submission error inline */}
      {error && (
        <div className="rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-2.5 animate-in fade-in duration-200">
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
