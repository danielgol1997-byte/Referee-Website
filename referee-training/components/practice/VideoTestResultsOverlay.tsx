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
  const correctRestart = clip.correctRestart?.name ?? (clip.playOn || clip.noOffence ? "Play on / No offence" : "—");
  const correctSanction = clip.correctSanction?.name ?? "—";
  const correctCriteria = clip.correctCriteria?.map((t) => t.name).join(", ") || "—";
  const userRestart = answer.playOnNoOffence ? "Play on / No offence" : (answer.userRestartTag?.name ?? "—");
  const userSanction = answer.playOnNoOffence ? "—" : (answer.userSanctionTag?.name ?? "—");
  const userCriteria = answer.playOnNoOffence ? "—" : (answer.userCriteriaTags?.map((t) => t.name).join(", ") || "—");

  const restartOk = answer.playOnNoOffence ? (clip.playOn || clip.noOffence) : (answer.restartTagId && clip.correctRestart ? answer.restartTagId === clip.correctRestart.id : !clip.correctRestart && !answer.restartTagId);
  const sanctionOk = answer.playOnNoOffence ? true : (answer.sanctionTagId && clip.correctSanction ? answer.sanctionTagId === clip.correctSanction.id : !clip.correctSanction && !answer.sanctionTagId);
  const criteriaCorrectSet = new Set(clip.correctCriteria?.map((c) => c.id) ?? []);
  const userCriteriaSet = new Set(answer.criteriaTagIds ?? []);
  const criteriaOk = answer.playOnNoOffence ? true : (criteriaCorrectSet.size === 0 && userCriteriaSet.size === 0) || (criteriaCorrectSet.size === userCriteriaSet.size && [...criteriaCorrectSet].every((id) => userCriteriaSet.has(id)));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100100]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto z-[100110]">
        <div
          className={cn(
            "relative w-full max-w-3xl backdrop-blur-xl bg-gradient-to-br from-[#0F1419]/70 to-[#1E293B]/80",
            "rounded-lg shadow-2xl border-2",
            answer.isCorrect ? "border-status-success/60" : answer.isPartial ? "border-amber-500/60" : "border-status-danger/60"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn(
            "px-8 pt-8 pb-4 border-b-4",
            answer.isCorrect ? "border-status-success" : answer.isPartial ? "border-amber-500" : "border-status-danger"
          )}>
            <h2 className="text-xl font-bold uppercase tracking-wider text-center text-white">
              {clip.title}
            </h2>
            <p className={cn(
              "text-center text-sm font-semibold mt-1",
              answer.isCorrect ? "text-status-success" : answer.isPartial ? "text-amber-400" : "text-status-danger"
            )}>
              {answer.isCorrect ? "Correct" : answer.isPartial ? "Partially correct" : "Incorrect"}
            </p>
          </div>

          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Restart</div>
                <div className="space-y-1 text-sm">
                  <div className={cn(restartOk ? "text-status-success" : "text-status-danger")}>
                    Your answer: {userRestart}
                  </div>
                  {!restartOk && <div className="text-status-success">Correct: {correctRestart}</div>}
                  {restartOk && <div className="text-status-success">Correct</div>}
                </div>
              </div>
              <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Sanction</div>
                <div className="space-y-1 text-sm">
                  <div className={cn(sanctionOk ? "text-status-success" : "text-status-danger")}>
                    Your answer: {userSanction}
                  </div>
                  {!sanctionOk && <div className="text-status-success">Correct: {correctSanction}</div>}
                  {sanctionOk && <div className="text-status-success">Correct</div>}
                </div>
              </div>
              <div className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Criteria</div>
                <div className="space-y-1 text-sm">
                  <div className={cn(criteriaOk ? "text-status-success" : "text-status-danger")}>
                    Your answer: {userCriteria || "—"}
                  </div>
                  {!criteriaOk && <div className="text-status-success">Correct: {correctCriteria}</div>}
                  {criteriaOk && <div className="text-status-success">Correct</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t border-accent/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-accent hover:bg-accent/90 text-dark-900 font-semibold text-sm uppercase tracking-wide rounded-lg"
            >
              Close (I)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
