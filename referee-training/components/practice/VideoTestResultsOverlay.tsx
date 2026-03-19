"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type TagLike = { id: string; name: string } | null;

type Item = {
  clip: {
    id: string;
    title: string;
    fileUrl?: string | null;
    thumbnailUrl?: string | null;
    playOn?: boolean;
    noOffence?: boolean;
    correctRestart: TagLike;
    correctSanction: TagLike;
    correctCriteria: { id: string; name: string }[];
  } | null;
  answer: {
    playOnNoOffence: boolean;
    restartTagId: string | null;
    sanctionTagId: string | null;
    criteriaTagIds: string[];
    userRestartTag: TagLike;
    userSanctionTag: TagLike;
    userCriteriaTags: { id: string; name: string }[];
    isCorrect: boolean;
    isPartial: boolean;
  } | null;
};

interface VideoTestResultsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
}

const CATEGORY_COLORS: Record<string, string> = {
  restarts: "#4A90E2",
  sanction: "#EC4899",
  criteria: "#FFD93D",
};

function DecisionCard({
  label,
  color,
  userAnswer,
  expectedAnswer,
  isCorrect,
}: {
  label: string;
  color: string;
  userAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
}) {
  return (
    <div
      className="rounded-lg border p-3 transition-colors"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      <div
        className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
      <div className="space-y-1.5">
        <div
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-sm font-medium",
            isCorrect
              ? "border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e]"
              : "border-[#ef4444] bg-[#ef4444]/20 text-[#ef4444]"
          )}
        >
          <span className="mr-1.5 text-[10px] uppercase tracking-wider opacity-90">You:</span>
          {userAnswer}
        </div>
        <div className="rounded-md border border-white/35 bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white">
          <span className="mr-1.5 text-[10px] uppercase tracking-wider text-text-secondary">Correct:</span>
          {expectedAnswer}
        </div>
      </div>
    </div>
  );
}

export function VideoTestResultsOverlay({ isOpen, onClose, item }: VideoTestResultsOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "i" || e.key === "I") && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item.clip || !item.answer) return null;

  const { clip, answer } = item;

  const correctRestartName = clip.correctRestart?.name ?? "—";
  const correctSanctionName = clip.correctSanction?.name ?? "—";
  const correctCriteriaNames = clip.correctCriteria?.map((t) => t.name).join(", ") || "—";

  const userRestart = answer.userRestartTag?.name ?? "—";
  const userSanction = answer.userSanctionTag?.name ?? "—";
  const userCriteria = answer.userCriteriaTags?.map((t) => t.name).join(", ") || "—";

  const restartOk = !clip.correctRestart
    ? !answer.restartTagId
    : answer.restartTagId === clip.correctRestart.id;
  const sanctionOk = !clip.correctSanction
    ? !answer.sanctionTagId
    : answer.sanctionTagId === clip.correctSanction.id;

  const criteriaCorrectSet = new Set(clip.correctCriteria?.map((c) => c.id) ?? []);
  const userCriteriaSet = new Set(answer.criteriaTagIds ?? []);
  const criteriaOk = criteriaCorrectSet.size === 0
    ? true
    : [...userCriteriaSet].some((id) => criteriaCorrectSet.has(id));

  const computedCorrect = restartOk && sanctionOk && criteriaOk;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100100] transition-opacity" onClick={onClose} />
      <div
        className="fixed inset-x-0 top-16 bottom-3 z-[100110] flex items-center justify-center px-4"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative flex w-full max-w-4xl flex-col overflow-hidden backdrop-blur-xl bg-gradient-to-br from-dark-900/95 to-dark-800/95",
            "max-h-[calc(100dvh-5.5rem)] rounded-xl shadow-2xl border",
            "animate-in fade-in zoom-in-95 duration-200",
            computedCorrect ? "border-[#22c55e]/45" : "border-[#ef4444]/45"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "px-6 pt-4 pb-2 border-b-2",
            computedCorrect ? "border-[#22c55e]/60" : "border-[#ef4444]/60"
          )}>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  computedCorrect
                    ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/45"
                    : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/45"
                )}
              >
                {computedCorrect ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {computedCorrect ? "Correct" : "Incorrect"}
              </div>
            </div>
          </div>

          <div className="space-y-3 px-6 py-3">
            {clip.fileUrl && (
              <div className="h-[min(32dvh,300px)] overflow-hidden rounded-lg border border-dark-600 bg-black/60">
                <video
                  src={clip.fileUrl}
                  poster={clip.thumbnailUrl ?? undefined}
                  controls
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DecisionCard
                label="Restart"
                color={CATEGORY_COLORS.restarts}
                userAnswer={userRestart}
                expectedAnswer={correctRestartName}
                isCorrect={!!restartOk}
              />
              <DecisionCard
                label="Sanction"
                color={CATEGORY_COLORS.sanction}
                userAnswer={userSanction}
                expectedAnswer={correctSanctionName}
                isCorrect={!!sanctionOk}
              />
              <DecisionCard
                label="Criteria"
                color={CATEGORY_COLORS.criteria}
                userAnswer={userCriteria || "—"}
                expectedAnswer={correctCriteriaNames}
                isCorrect={!!criteriaOk}
              />
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
