"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { InlineVideoPlayer } from "@/components/library/InlineVideoPlayer";
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
  const [showAnswerOverlay, setShowAnswerOverlay] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
  const currentAnswer = currentClip ? answers[currentClip.id] ?? emptyAnswer : emptyAnswer;
  const answeredCount = clips.filter((c) => {
    const a = answers[c.id];
    if (!a) return false;
    if (a.playOnNoOffence) return true;
    return a.restartTagId !== null || a.sanctionTagId !== null || a.criteriaTagIds.length > 0;
  }).length;
  const allAnswered = clips.length > 0 && answeredCount === clips.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === clips.length - 1;

  const setCurrentAnswer = (value: VideoTestAnswerValue) => {
    if (!currentClip) return;
    setAnswers((prev) => ({ ...prev, [currentClip.id]: value }));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !showConfirmation) {
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
    <div className="space-y-6 relative">
      <div className="space-y-3 relative z-[100000]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Video {currentIndex + 1} <span className="text-text-secondary">/ {clips.length}</span>
          </h2>
          <div className="text-sm text-text-secondary">
            {answeredCount} of {clips.length} answered
          </div>
        </div>
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-cyan-400 transition-all duration-300"
            style={{ width: `${(answeredCount / clips.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative rounded-xl border border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden">
        <InlineVideoPlayer
          video={currentClip}
          isExpanded={true}
          isAnswerOpen={showAnswerOverlay}
          onClose={() => router.push("/practice/video-tests")}
          onDecisionReveal={() => setShowAnswerOverlay(true)}
          onCloseDecision={() => setShowAnswerOverlay(false)}
          onNext={() => setCurrentIndex((i) => Math.min(i + 1, clips.length - 1))}
          onPrev={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          hasNext={!isLast}
          hasPrev={!isFirst}
          showDecision={false}
        />
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

      <div className="flex items-center justify-between gap-4 relative z-[100000]">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {clips.map((clip, idx) => {
            const answered = !!answers[clip.id]?.playOnNoOffence ||
              !!answers[clip.id]?.restartTagId ||
              !!answers[clip.id]?.sanctionTagId ||
              (answers[clip.id]?.criteriaTagIds?.length ?? 0) > 0;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-xl text-sm font-bold transition-all",
                  isCurrent
                    ? "bg-accent text-dark-900 shadow-lg"
                    : answered
                      ? "bg-dark-700 text-white border-2 border-accent/50"
                      : "bg-dark-800 text-text-secondary border-2 border-dark-600 hover:border-accent/30"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        {allAnswered && !showConfirmation && (
          <button
            type="button"
            onClick={() => setShowConfirmation(true)}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-accent text-dark-900 font-semibold hover:opacity-90"
          >
            Submit test
          </button>
        )}
      </div>

      {showConfirmation && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-dark-800 border border-dark-600 relative z-[100001]">
          <span className="text-white">Are you sure you want to submit? You cannot change answers after submitting.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 rounded-lg bg-dark-700 text-white border border-dark-600 hover:border-accent/50"
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-accent text-dark-900 font-semibold disabled:opacity-70"
            >
              {submitting ? "Submitting…" : "Yes, submit"}
            </button>
          </div>
          {error && <p className="w-full text-sm text-status-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
