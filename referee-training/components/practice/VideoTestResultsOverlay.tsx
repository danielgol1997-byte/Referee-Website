"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type TagLike = { id: string; name: string } | null;

type Item = {
  clip: {
    id: string;
    title: string;
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
      className="rounded-lg p-4 border transition-colors"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-3 text-center"
        style={{ color }}
      >
        {label}
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider font-medium",
              isCorrect ? "text-[#22c55e]" : "text-[#ef4444]"
            )}
          >
            Your answer
          </div>
          <div
            className={cn(
              "text-sm font-medium rounded-md px-2.5 py-1.5 border",
              isCorrect
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                : "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
            )}
          >
            <div className="flex items-center gap-1.5">
              {isCorrect ? (
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {userAnswer}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">
            Expected
          </div>
          <div className="text-sm font-medium rounded-md px-2.5 py-1.5 border border-white/35 bg-white/10 text-white">
            {expectedAnswer}
          </div>
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

  // Did the user select play-on?
  const userSelectedPlayOn = answer.playOnNoOffence;
  // Is the correct answer actually play-on/no-offence?
  const correctIsPlayOn = !!(clip.playOn || clip.noOffence);

  // Expected answers per category (for when the answer is NOT play-on)
  const correctRestart = clip.correctRestart?.name ?? "—";
  const correctSanction = clip.correctSanction?.name ?? "—";
  const correctCriteria = clip.correctCriteria?.map((t) => t.name).join(", ") || "—";

  // User answers per category (only meaningful if user didn't select play-on)
  const userRestart = answer.userRestartTag?.name ?? "—";
  const userSanction = answer.userSanctionTag?.name ?? "—";
  const userCriteria = answer.userCriteriaTags?.map((t) => t.name).join(", ") || "—";

  // Per-category correctness (only when user did NOT select play-on)
  const restartOk = !userSelectedPlayOn &&
    (answer.restartTagId && clip.correctRestart ? answer.restartTagId === clip.correctRestart.id : !clip.correctRestart && !answer.restartTagId);
  const sanctionOk = !userSelectedPlayOn &&
    (answer.sanctionTagId && clip.correctSanction ? answer.sanctionTagId === clip.correctSanction.id : !clip.correctSanction && !answer.sanctionTagId);
  const criteriaCorrectSet = new Set(clip.correctCriteria?.map((c) => c.id) ?? []);
  const userCriteriaSet = new Set(answer.criteriaTagIds ?? []);
  const criteriaOk = !userSelectedPlayOn &&
    (
      (criteriaCorrectSet.size === 0 && userCriteriaSet.size === 0) ||
      [...userCriteriaSet].some((id) => criteriaCorrectSet.has(id))
    );

  // Overall play-on correctness
  const playOnOk = userSelectedPlayOn && correctIsPlayOn;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100100] transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto z-[100110]">
        <div
          className={cn(
            "relative w-full max-w-2xl backdrop-blur-xl bg-gradient-to-br from-dark-900/95 to-dark-800/95",
            "rounded-xl shadow-2xl border",
            "animate-in fade-in zoom-in-95 duration-200",
            answer.isCorrect ? "border-[#22c55e]/45" : "border-[#ef4444]/45"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "px-6 pt-6 pb-3 border-b-2",
            answer.isCorrect ? "border-[#22c55e]/60" : "border-[#ef4444]/60"
          )}>
            <h2 className="text-lg font-bold text-center text-white line-clamp-2">
              {clip.title}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  answer.isCorrect
                    ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/45"
                    : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/45"
                )}
              >
                {answer.isCorrect ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {answer.isCorrect ? "Correct" : "Incorrect"}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* ─── Play on / No offence — shown when user selected it ─── */}
            {userSelectedPlayOn && (
              <div className="rounded-lg border border-dark-600 bg-dark-800/60 p-4">
                <div
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest mb-2 text-center",
                    playOnOk ? "text-[#22c55e]" : "text-[#ef4444]"
                  )}
                >
                  Your answer
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold rounded-md px-3 py-2 border flex items-center justify-center gap-2",
                    playOnOk
                      ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]"
                      : "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                  )}
                >
                  {playOnOk ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  Play on / No offence
                </div>
              </div>
            )}

            {/* ─── Per-category cards ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userSelectedPlayOn ? (
                <>
                  {/* User chose play-on — show expected answers in each category */}
                  <DecisionCard
                    label="Restart"
                    color={CATEGORY_COLORS.restarts}
                    userAnswer="Play on / No offence"
                    expectedAnswer={correctIsPlayOn ? "Play on / No offence" : correctRestart}
                    isCorrect={playOnOk}
                  />
                  <DecisionCard
                    label="Sanction"
                    color={CATEGORY_COLORS.sanction}
                    userAnswer="—"
                    expectedAnswer={correctIsPlayOn ? "—" : correctSanction}
                    isCorrect={playOnOk}
                  />
                  <DecisionCard
                    label="Criteria"
                    color={CATEGORY_COLORS.criteria}
                    userAnswer="—"
                    expectedAnswer={correctIsPlayOn ? "—" : correctCriteria}
                    isCorrect={playOnOk}
                  />
                </>
              ) : (
                <>
                  {/* User answered with categories */}
                  <DecisionCard
                    label="Restart"
                    color={CATEGORY_COLORS.restarts}
                    userAnswer={userRestart}
                    expectedAnswer={correctIsPlayOn ? "Play on / No offence" : correctRestart}
                    isCorrect={correctIsPlayOn ? false : !!restartOk}
                  />
                  <DecisionCard
                    label="Sanction"
                    color={CATEGORY_COLORS.sanction}
                    userAnswer={userSanction}
                    expectedAnswer={correctIsPlayOn ? "—" : correctSanction}
                    isCorrect={correctIsPlayOn ? false : !!sanctionOk}
                  />
                  <DecisionCard
                    label="Criteria"
                    color={CATEGORY_COLORS.criteria}
                    userAnswer={userCriteria || "—"}
                    expectedAnswer={correctIsPlayOn ? "—" : correctCriteria}
                    isCorrect={correctIsPlayOn ? false : !!criteriaOk}
                  />
                </>
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
              <kbd className="ml-2 text-[10px] font-mono opacity-60 bg-dark-900/20 px-1.5 py-0.5 rounded">I</kbd>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
