"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { VideoTestAnswerOverlay, type VideoTestAnswerValue } from "./VideoTestAnswerOverlay";
import { useModal } from "@/components/ui/modal";

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
  const modal = useModal();
  const [clips, setClips] = useState<Clip[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOptions>({ restarts: [], sanction: [], criteria: [] });
  const [criteriaByClipId, setCriteriaByClipId] = useState<Record<string, TagOptions["criteria"]>>({});
  const [isMandatory, setIsMandatory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, VideoTestAnswerValue>>({});
  const [playedLoops, setPlayedLoops] = useState<Record<string, number>>({});
  const [maxViewsPerClip, setMaxViewsPerClip] = useState<number | null>(null);
  const [showAnswerOverlay, setShowAnswerOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [clipLocked, setClipLocked] = useState<Record<string, boolean>>({});
  const [questionStartedAt, setQuestionStartedAt] = useState<Record<string, number>>({});
  const [answerDurationsMs, setAnswerDurationsMs] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setCriteriaByClipId(data.criteriaByClipId ?? {});
        setIsMandatory(Boolean(data.isMandatory));
        // 0 or null means unlimited; only positive numbers are actual limits
        setMaxViewsPerClip(
          typeof data.maxViewsPerClip === "number" && data.maxViewsPerClip > 0
            ? data.maxViewsPerClip
            : null
        );
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
  const loopTarget = maxViewsPerClip && maxViewsPerClip > 0 ? maxViewsPerClip : 1;
  const currentClipPlayedLoops = currentClip ? playedLoops[currentClip.id] ?? 0 : 0;
  const remainingLoops = currentClip ? Math.max(loopTarget - currentClipPlayedLoops, 0) : 0;
  const currentAnswer = currentClip ? answers[currentClip.id] ?? emptyAnswer : emptyAnswer;
  // A clip is fully answered when EITHER play-on is checked OR all three fields are set
  const isFullyAnswered = (a: VideoTestAnswerValue | undefined): boolean => {
    if (!a) return false;
    if (a.playOnNoOffence) return true;
    return a.restartTagId !== null && a.sanctionTagId !== null && a.criteriaTagIds.length > 0;
  };
  const answeredCount = clips.filter((c) => isFullyAnswered(answers[c.id])).length;
  const progressPercent = clips.length > 0 ? (answeredCount / clips.length) * 100 : 0;

  const setCurrentAnswer = (value: VideoTestAnswerValue) => {
    if (!currentClip) return;
    setAnswers((prev) => ({ ...prev, [currentClip.id]: value }));
  };

  const stopPlayback = useCallback((preserveTime = true) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    if (!preserveTime) {
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedVolume = window.localStorage.getItem("video-test-volume");
    const savedMuted = window.localStorage.getItem("video-test-muted");

    if (savedVolume !== null) {
      const parsed = Number(savedVolume);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolume(parsed);
      }
    }
    if (savedMuted !== null) {
      setMuted(savedMuted === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("video-test-volume", String(volume));
  }, [volume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("video-test-muted", String(muted));
  }, [muted]);

  useEffect(() => {
    stopPlayback(false);
    setShowAnswerOverlay(false);
    if (currentClip && clipLocked[currentClip.id]) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
    if (currentClip) {
      setQuestionStartedAt((prev) => prev[currentClip.id] ? prev : { ...prev, [currentClip.id]: Date.now() });
    }
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          if (videoRef.current && currentClip && !clipLocked[currentClip.id]) {
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
  }, [currentIndex, currentClip, stopPlayback, clipLocked]);

  useEffect(() => {
    if (!showAnswerOverlay) return;
    stopPlayback();
    setCountdown(null);
  }, [showAnswerOverlay, stopPlayback]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = muted;
  }, [volume, muted, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingContext =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingContext) return;

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          timeToAnswerMs: answerDurationsMs[c.id] ?? null,
          questionStartedAt: questionStartedAt[c.id] ? new Date(questionStartedAt[c.id]).toISOString() : null,
          questionAnsweredAt:
            answerDurationsMs[c.id] && questionStartedAt[c.id]
              ? new Date(questionStartedAt[c.id] + answerDurationsMs[c.id]).toISOString()
              : null,
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

  const handleOverlayAction = async () => {
    if (!currentClip) return;
    const answer = answers[currentClip.id] ?? emptyAnswer;
    if (!isFullyAnswered(answer)) return;

    stopPlayback();
    setShowAnswerOverlay(false);
    setClipLocked((prev) => ({ ...prev, [currentClip.id]: true }));
    if (questionStartedAt[currentClip.id]) {
      setAnswerDurationsMs((prev) => ({
        ...prev,
        [currentClip.id]: Math.max(Date.now() - questionStartedAt[currentClip.id], 0),
      }));
    }

    if (currentIndex === clips.length - 1) {
      await handleConfirmSubmit();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleExit = async () => {
    const confirmed = await modal.showConfirm(
      "Are you sure you want to exit? This attempt will be disqualified.",
      "Exit Test",
      "warning"
    );
    if (!confirmed) return;
    router.push("/practice");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !isPlaying) {
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

  return (
    <div className="relative flex h-[calc(100vh-7.5rem)] flex-col gap-3 overflow-hidden">
      {/* ─── Header: title + answered counter ─── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white drop-shadow">
          Video {currentIndex + 1} <span className="text-text-secondary font-normal text-lg">/ {clips.length}</span>
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
            preload="metadata"
            controls={false}
            className="h-full w-full object-contain select-none"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (!currentClip || clipLocked[currentClip.id]) return;
              setPlayedLoops((prev) => {
                const nextPlayed = (prev[currentClip.id] ?? 0) + 1;
                const updated = { ...prev, [currentClip.id]: nextPlayed };
                if (nextPlayed < loopTarget && videoRef.current) {
                  videoRef.current.currentTime = 0;
                  void videoRef.current.play().catch(() => {});
                } else {
                  setShowAnswerOverlay(true);
                }
                return updated;
              });
            }}
          />
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="rounded-full border border-cyan-300/60 bg-dark-900/85 px-8 py-5 text-5xl font-black text-cyan-300 shadow-2xl animate-in zoom-in-95 duration-200">
                {countdown}
              </div>
            </div>
          )}
        </div>

        {/* ─── Controls bar ─── */}
        <div className="border-t border-dark-600 bg-dark-900/80 px-4 py-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-xs text-text-secondary">
              Views this clip: <span className="font-semibold text-white tabular-nums">{Math.min(currentClipPlayedLoops, loopTarget)}</span> /{" "}
              <span className="font-semibold text-white tabular-nums">{loopTarget}</span>
              <span className="mx-1.5 text-dark-500">|</span>
              {remainingLoops > 0 ? (
                <>
                  Replays left: <span className="font-semibold text-cyan-300 tabular-nums">{remainingLoops}</span>
                </>
              ) : (
                <span className="font-semibold text-accent">Ready to answer</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleExit}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-dark-600 hover:text-white hover:border-accent/40 transition-all duration-200"
            >
              Exit test
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

      {/* ─── Clip index + answer action ─── */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-center gap-2 overflow-visible pt-2 pb-1 max-w-full px-2 justify-center md:justify-start flex-wrap">
          {clips.map((clip, idx) => {
            const a = answers[clip.id];
            const full = isFullyAnswered(a);
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={clip.id}
                className={cn(
                  "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold leading-none tabular-nums transition-all duration-200",
                  isCurrent
                    ? "bg-accent text-dark-900 shadow-lg shadow-accent/30 scale-110"
                    : full
                      ? "bg-accent/15 text-accent border-2 border-accent/60 hover:border-accent hover:bg-accent/25"
                      : "bg-dark-800 text-text-secondary border-2 border-dark-600"
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
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center md:justify-end gap-2 pb-1">
          <div className="rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-xs text-text-secondary">
            Views left:{" "}
            <span className="font-semibold text-cyan-300 tabular-nums">{remainingLoops}</span>
            <span className="mx-1 text-dark-500">|</span>
            <span className="tabular-nums font-semibold text-white">{Math.min(currentClipPlayedLoops, loopTarget)}</span>
            <span className="mx-1 text-text-secondary">/</span>
            <span className="tabular-nums font-semibold text-white">{loopTarget}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopPlayback();
              setShowAnswerOverlay(true);
            }}
            className={cn(
              "px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200",
              "bg-gradient-to-r from-accent to-cyan-400 text-dark-900 border border-cyan-300/40",
              "hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98]"
            )}
          >
            Answer question
          </button>
        </div>
        <p className="text-xs text-text-muted md:col-span-2">Questions run in fixed order. Once you press Next, that clip is final.</p>
      </div>

      {/* Submission error inline */}
      {error && (
        <div className="rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-2.5 animate-in fade-in duration-200">
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}

      {/* Answer overlay */}
      {showAnswerOverlay && (
        <VideoTestAnswerOverlay
          isOpen={true}
          onClose={() => {}}
          onAction={handleOverlayAction}
          actionLabel={currentIndex === clips.length - 1 ? "Submit" : "Next"}
          actionDisabled={submitting}
          tagOptions={{
            ...tagOptions,
            criteria: currentClip ? (criteriaByClipId[currentClip.id] ?? tagOptions.criteria) : tagOptions.criteria,
          }}
          value={currentAnswer}
          onChange={setCurrentAnswer}
        />
      )}
    </div>
  );
}
