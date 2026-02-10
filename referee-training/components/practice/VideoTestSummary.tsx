"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VideoTestResultsOverlay } from "./VideoTestResultsOverlay";

type SummaryItem = {
  clip: {
    id: string;
    title: string;
    fileUrl: string;
    thumbnailUrl?: string | null;
    playOn?: boolean;
    noOffence?: boolean;
    correctRestart: { id: string; name: string } | null;
    correctSanction: { id: string; name: string } | null;
    correctCriteria: { id: string; name: string }[];
  } | null;
  answer: {
    playOnNoOffence: boolean;
    restartTagId: string | null;
    sanctionTagId: string | null;
    criteriaTagIds: string[];
    userRestartTag: { id: string; name: string } | null;
    userSanctionTag: { id: string; name: string } | null;
    userCriteriaTags: { id: string; name: string }[];
    isCorrect: boolean;
    isPartial: boolean;
  } | null;
};

type SummaryData = {
  session: {
    id: string;
    score: number | null;
    totalClips: number;
    videoTest: { name: string };
  };
  correctCount: number;
  total: number;
  items: SummaryItem[];
};

export function VideoTestSummary({
  sessionId,
  restartHref = "/practice/video-tests",
}: {
  sessionId: string;
  restartHref?: string;
}) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tests/videos/${sessionId}/summary`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json?.error ?? "Failed to load summary");
          return;
        }
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load summary");
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "i" && e.key !== "I") return;
      if (openItemIndex !== null) {
        setOpenItemIndex(null);
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openItemIndex]);

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-status-dangerBg border border-status-danger/30">
        <p className="text-sm text-status-danger">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const score = data.session.score ?? data.correctCount;
  const percentage = data.total > 0 ? Math.round((score / data.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="relative rounded-xl border border-dark-600 bg-dark-800/80 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-cyan-400/20" />
        </div>
        <div className="relative p-6 md:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900/80 border border-accent/30 shadow-lg shadow-accent/10">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-white uppercase tracking-wider">Test Complete</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-white to-text-secondary bg-clip-text text-transparent">
            {score} <span className="text-text-secondary">/ {data.session.totalClips}</span>
          </h1>
          <p className="text-lg text-text-secondary">{percentage}% Correct</p>
          <div className="pt-2">
            <Button asChild size="lg" className="gap-2 bg-dark-700 text-white border-2 border-accent/30 hover:border-accent hover:bg-dark-600">
              <Link href={restartHref}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Video Tests
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-dark-600" />
        <h2 className="text-lg font-semibold text-white uppercase tracking-wider">Question Review</h2>
        <div className="flex-1 h-px bg-dark-600" />
      </div>

      <div className="space-y-4">
        {data.items.map((item, index) => {
          const answer = item.answer;
          const clip = item.clip;
          const frameClass = answer?.isCorrect
            ? "border-status-success ring-2 ring-status-success/50"
            : answer?.isPartial
              ? "border-amber-500 ring-2 ring-amber-500/50"
              : "border-status-danger ring-2 ring-status-danger/50";

          return (
            <div key={clip?.id ?? index} className="rounded-xl border-2 border-dark-600 bg-gradient-to-b from-dark-700 to-dark-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenItemIndex(openItemIndex === index ? null : index)}
                className={cn(
                  "w-full px-6 py-4 flex items-center justify-between text-left transition-all rounded-xl border-2",
                  frameClass
                )}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      answer?.isCorrect ? "bg-status-success/20 text-status-success" : answer?.isPartial ? "bg-amber-500/20 text-amber-400" : "bg-status-danger/20 text-status-danger"
                    )}
                  >
                    {answer?.isCorrect ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white">Video {index + 1}</span>
                  {clip?.title && <span className="text-text-secondary text-sm line-clamp-1">{clip.title}</span>}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Press I or click to view answers
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href={restartHref}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Video Tests
          </Link>
        </Button>
      </div>

      {openItemIndex !== null && data.items[openItemIndex] && (
        <VideoTestResultsOverlay
          isOpen={true}
          onClose={() => setOpenItemIndex(null)}
          item={data.items[openItemIndex]}
        />
      )}
    </div>
  );
}
