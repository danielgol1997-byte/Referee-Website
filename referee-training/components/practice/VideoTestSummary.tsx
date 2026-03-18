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
    videoTest: {
      name: string;
      passingScore?: number | null;
    };
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
  const passingScore =
    typeof data.session.videoTest.passingScore === "number"
      ? data.session.videoTest.passingScore
      : null;
  const didPass = passingScore !== null ? percentage >= passingScore : null;

  const POSITIVE_MESSAGES = [
    "Excellent performance.",
    "Outstanding accuracy.",
    "Very well done.",
    "Impressive result.",
    "Strong showing.",
  ];
  const positiveMessage =
    didPass === true || percentage >= 90
      ? POSITIVE_MESSAGES[score % POSITIVE_MESSAGES.length]
      : null;

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
          {passingScore !== null ? (
            <div className="mx-auto inline-flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-900/80 px-3 py-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                  didPass
                    ? "border border-[#22c55e]/45 bg-[#22c55e]/15 text-[#22c55e]"
                    : "border border-[#ef4444]/45 bg-[#ef4444]/15 text-[#ef4444]"
                )}
              >
                {didPass ? "Passed" : "Failed"}
              </span>
              <p className="text-sm text-text-secondary">
                Pass mark: <span className="font-semibold text-white">{passingScore}%</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No pass mark set for this test.</p>
          )}
          {positiveMessage && (
            <p className="text-sm font-medium tracking-wide text-[#22c55e]/80">{positiveMessage}</p>
          )}
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

      <div className="mx-auto w-full max-w-4xl space-y-4">
        {data.items.map((item, index) => {
          const answer = item.answer;
          const clip = item.clip;
          const userSelectedPlayOn = !!answer?.playOnNoOffence;
          const correctIsPlayOn = !!(clip?.playOn || clip?.noOffence);
          const restartOk = answer && clip
            ? (userSelectedPlayOn
              ? correctIsPlayOn
              : answer.restartTagId && clip.correctRestart
                ? answer.restartTagId === clip.correctRestart.id
                : !clip.correctRestart && !answer.restartTagId)
            : false;
          const sanctionOk = answer && clip
            ? (userSelectedPlayOn
              ? correctIsPlayOn
              : answer.sanctionTagId && clip.correctSanction
                ? answer.sanctionTagId === clip.correctSanction.id
                : !clip.correctSanction && !answer.sanctionTagId)
            : false;
          const criteriaOk = answer && clip
            ? (userSelectedPlayOn
              ? correctIsPlayOn
              : (() => {
                  const correctSet = new Set(clip.correctCriteria.map((c) => c.id));
                  const userSet = new Set(answer.criteriaTagIds);
                  if (correctSet.size === 0 && userSet.size === 0) return true;
                  return [...userSet].some((id) => correctSet.has(id));
                })())
            : false;
          const frameClass = answer?.isCorrect
            ? "border-[#22c55e]"
            : "border-[#ef4444]";

          return (
            <div key={clip?.id ?? index} className="overflow-hidden rounded-xl bg-gradient-to-b from-dark-700 to-dark-800">
              <button
                type="button"
                onClick={() => setOpenItemIndex(openItemIndex === index ? null : index)}
                className={cn(
                  "group relative w-full rounded-xl border-2 bg-clip-padding px-6 py-4 text-left transition-all duration-200 cursor-pointer",
                  "hover:bg-dark-700/60 hover:shadow-xl",
                  "active:scale-[0.995]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                  frameClass
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                        answer?.isCorrect ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#ef4444]/20 text-[#ef4444]"
                      )}
                    >
                      {answer?.isCorrect ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-white">Video {index + 1}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className={restartOk ? "text-[#22c55e]" : "text-[#ef4444]"}>Restart</span>
                    <span className="text-text-muted">-</span>
                    <span className={sanctionOk ? "text-[#22c55e]" : "text-[#ef4444]"}>Sanction</span>
                    <span className="text-text-muted">-</span>
                    <span className={criteriaOk ? "text-[#22c55e]" : "text-[#ef4444]"}>Criteria</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "pointer-events-none absolute left-4 top-4 rounded-full border border-dark-500 bg-dark-900/75 p-1.5",
                    "opacity-0 scale-90 transition-all duration-200",
                    "group-hover:opacity-100 group-hover:scale-100 group-hover:border-cyan-400/60 group-hover:text-cyan-300"
                  )}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3.5" y="6.5" width="13" height="11" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.25l4-2.25v8l-4-2.25" />
                  </svg>
                </div>
                <div
                  className={cn(
                    "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-dark-500 bg-dark-900/70 p-1.5",
                    "text-text-secondary transition-all duration-200 group-hover:border-cyan-400/60 group-hover:text-cyan-300 group-hover:shadow-lg",
                    openItemIndex === index && "border-cyan-400/70 text-cyan-300 rotate-180"
                  )}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
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
