"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ArDecision = "OFFSIDE" | "ONSIDE";

export type ArSummaryItem = {
  clip: {
    id: string;
    title: string;
    fileUrl: string;
    thumbnailUrl?: string | null;
    correctAnswer: ArDecision;
    passMomentTime?: number | null;
    passFrameUrl?: string | null;
  } | null;
  answer: {
    userAnswer: ArDecision;
    isCorrect: boolean;
    timeToAnswerMs?: number | null;
  } | null;
};

interface ArTestResultsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  item: ArSummaryItem;
  clipNumber: number;
}

function decisionLabel(decision: ArDecision) {
  return decision === "OFFSIDE" ? "Offside" : "Onside";
}

function decisionColor(decision: ArDecision) {
  return decision === "OFFSIDE" ? "#ef4444" : "#22c55e";
}

export function ArTestResultsOverlay({ isOpen, onClose, item, clipNumber }: ArTestResultsOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "i" || e.key === "I") && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item.clip || !item.answer) return null;

  const { clip, answer } = item;
  const isCorrect = answer.isCorrect;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100100] transition-opacity" onClick={onClose} />
      <div
        className="fixed inset-x-0 top-16 bottom-3 z-[100110] flex items-center justify-center px-4"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative flex w-full max-w-5xl flex-col overflow-hidden backdrop-blur-xl bg-gradient-to-br from-dark-900/95 to-dark-800/95",
            "max-h-[calc(100dvh-5.5rem)] rounded-xl shadow-2xl border overflow-y-auto",
            "animate-in fade-in zoom-in-95 duration-200",
            isCorrect ? "border-[#22c55e]/45" : "border-[#ef4444]/45"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "px-6 pt-4 pb-3 border-b-2",
            isCorrect ? "border-[#22c55e]/60" : "border-[#ef4444]/60"
          )}>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-semibold text-text-secondary">Clip {clipNumber}</span>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  isCorrect
                    ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/45"
                    : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/45"
                )}
              >
                {isCorrect ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {isCorrect ? "Correct" : "Incorrect"}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-4">
            {/* Answer comparison */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-lg border-2 p-4 text-center",
                  isCorrect
                    ? "border-[#22c55e] bg-[#22c55e]/10"
                    : "border-[#ef4444] bg-[#ef4444]/10"
                )}
              >
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                  Your Call
                </p>
                <p
                  className="text-2xl font-black uppercase tracking-wider"
                  style={{ color: isCorrect ? "#22c55e" : "#ef4444" }}
                >
                  {decisionLabel(answer.userAnswer)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-white/30 bg-white/5 p-4 text-center">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                  Correct Call
                </p>
                <p
                  className="text-2xl font-black uppercase tracking-wider"
                  style={{ color: decisionColor(clip.correctAnswer) }}
                >
                  {decisionLabel(clip.correctAnswer)}
                </p>
              </div>
            </div>

            {/* Video replay + pass-moment frame */}
            <div className={cn(
              "grid grid-cols-1 gap-4",
              clip.passFrameUrl ? "lg:grid-cols-2" : ""
            )}>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                  Watch Again
                </p>
                <div className="h-[min(34dvh,320px)] overflow-hidden rounded-lg border border-dark-600 bg-black/60">
                  <video
                    src={clip.fileUrl}
                    poster={clip.thumbnailUrl ?? undefined}
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              {clip.passFrameUrl && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">
                    Moment of the Pass
                    {typeof clip.passMomentTime === "number" && (
                      <span className="ml-2 font-semibold normal-case tracking-normal text-text-muted">
                        ({clip.passMomentTime.toFixed(1)}s)
                      </span>
                    )}
                  </p>
                  <div className="h-[min(34dvh,320px)] overflow-hidden rounded-lg border border-cyan-500/40 bg-black/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={clip.passFrameUrl}
                      alt="Freeze-frame at the moment of the pass"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-600 flex justify-end">
            <button
              onClick={onClose}
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all duration-200",
                "bg-accent hover:bg-accent/90 text-dark-900",
                "hover:shadow-lg hover:shadow-accent/20"
              )}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
