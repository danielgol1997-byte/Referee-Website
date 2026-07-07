"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function EnlargeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "absolute right-2 top-2 z-10 rounded-lg border border-white/25 bg-black/60 p-2",
        "text-white/80 backdrop-blur-sm transition-all duration-150",
        "hover:border-cyan-400/70 hover:text-cyan-300 hover:bg-black/80"
      )}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    </button>
  );
}

export function ArTestResultsOverlay({ isOpen, onClose, item, clipNumber }: ArTestResultsOverlayProps) {
  const [enlarged, setEnlarged] = useState<"video" | "frame" | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape" || e.key === "i" || e.key === "I") {
        // Close the lightbox first, then the overlay.
        setEnlarged((current) => {
          if (current !== null) return null;
          onClose();
          return null;
        });
      }
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setEnlarged(null);
  }, [isOpen]);

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
            {/* Answer comparison — red/green is reserved for correctness only */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-lg border-2 p-4 text-center",
                  isCorrect
                    ? "border-[#22c55e]/60 bg-[#22c55e]/10"
                    : "border-[#ef4444]/60 bg-[#ef4444]/10"
                )}
              >
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                  Your Call
                </p>
                <p className="text-2xl font-black uppercase tracking-wider text-white">
                  {decisionLabel(answer.userAnswer)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-white/30 bg-white/5 p-4 text-center">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                  Correct Call
                </p>
                <p className="text-2xl font-black uppercase tracking-wider text-white">
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
                <div className="relative h-[min(34dvh,320px)] overflow-hidden rounded-lg border border-dark-600 bg-black/60">
                  <EnlargeButton onClick={() => setEnlarged("video")} label="Enlarge video" />
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
                  <div className="relative h-[min(34dvh,320px)] overflow-hidden rounded-lg border border-cyan-500/40 bg-black/60">
                    <EnlargeButton onClick={() => setEnlarged("frame")} label="Enlarge pass moment" />
                    <button
                      type="button"
                      onClick={() => setEnlarged("frame")}
                      className="block h-full w-full cursor-zoom-in"
                      title="Enlarge pass moment"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={clip.passFrameUrl}
                        alt="Freeze-frame at the moment of the pass"
                        className="h-full w-full object-contain"
                      />
                    </button>
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

      {/* ─── Fullscreen lightbox (portal escapes ancestor stacking contexts) ─── */}
      {enlarged !== null && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100200] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150"
          onClick={() => setEnlarged(null)}
        >
          <button
            type="button"
            onClick={() => setEnlarged(null)}
            aria-label="Close enlarged view"
            className={cn(
              "absolute right-4 top-4 z-10 rounded-lg border border-white/25 bg-black/60 p-2.5",
              "text-white/80 transition-all duration-150 hover:border-cyan-400/70 hover:text-cyan-300"
            )}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {enlarged === "video" ? (
            <video
              src={clip.fileUrl}
              poster={clip.thumbnailUrl ?? undefined}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : clip.passFrameUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={clip.passFrameUrl}
              alt="Freeze-frame at the moment of the pass"
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
}
