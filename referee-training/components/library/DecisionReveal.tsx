"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DecisionRevealProps {
  isOpen: boolean;
  onClose: () => void;
  playOn?: boolean;
  noOffence?: boolean;
  correctDecision?: string | null;
  restartType?: string | null;
  sanctionType?: string | null;
  offsideReason?: string | null;
  decisionExplanation?: string | null;
  keyPoints?: string[];
  commonMistakes?: string[];
  varRelevant?: boolean;
  varNotes?: string | null;
  isEducational?: boolean;
  lawNumbers?: number[];
  tags?: Array<{
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      slug: string;
      canBeCorrectAnswer: boolean;
    } | null;
    isCorrectDecision?: boolean;
    decisionOrder?: number;
  }>;
}

// Format enum values to readable text
const formatRestartType = (type: string): string => {
  const map: Record<string, string> = {
    PENALTY_KICK: "Penalty Kick",
    DIRECT_FREE_KICK: "Direct Free Kick",
    INDIRECT_FREE_KICK: "Indirect Free Kick",
    CORNER_KICK: "Corner Kick",
    GOAL_KICK: "Goal Kick",
    THROW_IN: "Throw-in",
    DROPPED_BALL: "Dropped Ball",
    KICK_OFF: "Kick-off",
  };
  return map[type] || type;
};

const formatSanctionType = (type: string): string => {
  const map: Record<string, string> = {
    NO_CARD: "No Card",
    YELLOW_CARD: "Yellow Card (Caution)",
    SECOND_YELLOW: "Second Yellow Card (Sending-off)",
    RED_CARD_DOGSO: "Red Card - DOGSO",
    RED_CARD_SFP: "Red Card - Serious Foul Play",
    RED_CARD_VC: "Red Card - Violent Conduct",
    RED_CARD_OTHER: "Red Card",
  };
  return map[type] || type;
};

const formatOffsideReason = (reason: string): string => {
  const map: Record<string, string> = {
    INTERFERING_WITH_PLAY: "Interfering with play",
    INTERFERING_WITH_OPPONENT: "Interfering with an opponent",
    GAINING_ADVANTAGE: "Gaining an advantage",
    NOT_OFFSIDE: "Not offside",
  };
  return map[reason] || reason;
};

/**
 * DecisionReveal - UEFA-style decision overlay
 * 
 * Professional, clean modal that displays:
 * - Match clips: Decision, Restart, Sanction, Explanation
 * - Educational clips: Explanation only
 * 
 * NO EMOJIS. NO PLAYFUL LANGUAGE. UEFA PROFESSIONAL STYLE ONLY.
 */
export function DecisionReveal({
  isOpen,
  onClose,
  playOn = false,
  noOffence = false,
  correctDecision,
  restartType,
  sanctionType,
  offsideReason,
  decisionExplanation,
  keyPoints = [],
  commonMistakes = [],
  varRelevant = false,
  varNotes,
  isEducational = false,
  lawNumbers = [],
  tags = [],
}: DecisionRevealProps) {
  // ESC or "i" key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "i" || e.key === "I") && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get correct decision tags by category
  const correctDecisionTags = tags
    .filter(tag => tag.isCorrectDecision === true)
    .sort((a, b) => (a.decisionOrder || 0) - (b.decisionOrder || 0));

  const restartTags = correctDecisionTags.filter(tag => tag.category?.slug === 'restarts');
  const sanctionTags = correctDecisionTags.filter(tag => tag.category?.slug === 'sanction');
  const criteriaTags = correctDecisionTags.filter(tag => tag.category?.slug === 'criteria');

  // Determine title based on ALL tags (not just correct decision tags)
  const hasHandball = tags.some(tag => tag.name.toLowerCase().includes('handball'));
  const hasOffside = tags.some(tag => tag.name.toLowerCase().includes('offside'));
  
  let offenceTitle = "Offence";
  if (hasHandball) {
    offenceTitle = "Handball Offence";
  } else if (hasOffside) {
    offenceTitle = "Offside Offence";
  }

  const hasDecisionData = playOn || noOffence || restartTags.length > 0 || sanctionTags.length > 0 || criteriaTags.length > 0 || correctDecision || restartType || sanctionType || offsideReason;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 z-[3000] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[3010] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className={cn(
            "relative w-full max-w-3xl bg-gradient-to-br from-[#0F1419] to-[#1E293B]",
            "rounded-lg shadow-2xl border-4",
            playOn || noOffence ? "border-green-500" : "border-red-500",
            "transform transition-all duration-300",
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title: Play on / No offence / Offence */}
          {!isEducational && (playOn || noOffence || hasDecisionData) && (
            <div className={cn(
              "px-8 pt-8 pb-4 border-b-4",
              playOn || noOffence ? "border-green-500" : "border-red-500"
            )}>
              <h2 className={cn(
                "text-4xl font-bold uppercase tracking-wider text-center",
                playOn || noOffence ? "text-green-400" : "text-red-400"
              )}>
                {playOn ? "Play On" : noOffence ? "No Offence" : offenceTitle}
              </h2>
            </div>
          )}

          {/* Content */}
          <div className="px-8 py-6 space-y-6">
            {/* 3-Section Layout for Match Clips */}
            {!isEducational && hasDecisionData && (
              <div className="grid grid-cols-3 gap-4">
                {/* Restart Section */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                    Restart
                  </div>
                  <div className="space-y-2 min-h-[60px] flex flex-col items-center justify-center">
                    {restartTags.length > 0 ? (
                      restartTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm font-semibold rounded text-center"
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : restartType ? (
                      <span className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm font-semibold rounded text-center">
                        {formatRestartType(restartType)}
                      </span>
                    ) : (
                      <div className="text-slate-600 text-xs text-center">—</div>
                    )}
                  </div>
                </div>

                {/* Sanction Section */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                    Sanction
                  </div>
                  <div className="space-y-2 min-h-[60px] flex flex-col items-center justify-center">
                    {sanctionTags.length > 0 ? (
                      sanctionTags.map((tag) => {
                        const isYellowCard = tag.name.toLowerCase().includes('yellow');
                        const isRedCard = tag.name.toLowerCase().includes('red');
                        
                        return (
                          <span
                            key={tag.id}
                            className={cn(
                              "px-3 py-1.5 text-sm font-semibold rounded text-center border-2",
                              isYellowCard && "bg-yellow-500/30 border-yellow-500 text-yellow-300",
                              isRedCard && "bg-red-500/30 border-red-500 text-red-300",
                              !isYellowCard && !isRedCard && "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                            )}
                          >
                            {tag.name}
                          </span>
                        );
                      })
                    ) : sanctionType ? (
                      <span className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm font-semibold rounded text-center">
                        {formatSanctionType(sanctionType)}
                      </span>
                    ) : (
                      <div className="text-slate-600 text-xs text-center">—</div>
                    )}
                  </div>
                </div>

                {/* Criteria Section */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                    Criteria
                  </div>
                  <div className="space-y-2 min-h-[60px] flex flex-col items-center justify-center">
                    {criteriaTags.length > 0 ? (
                      criteriaTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm font-semibold rounded text-center"
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <div className="text-slate-600 text-xs text-center">—</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Legacy: Offside Reason */}
            {offsideReason && !isEducational && (
              <div className="bg-slate-800/50 rounded-lg p-5 mt-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 text-center">
                  Offside Reason
                </div>
                <div className="text-lg font-medium text-white text-center">
                  {formatOffsideReason(offsideReason)}
                </div>
              </div>
            )}

            {/* Explanation */}
            {decisionExplanation && (
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                <div className={cn(
                  "text-sm font-semibold text-white uppercase tracking-wider mb-3",
                  isEducational && "text-center"
                )}>
                  {isEducational ? "Explanation" : "Why"}
                </div>
                <div className={cn(
                  "text-slate-300 leading-relaxed whitespace-pre-line",
                  isEducational && "text-center text-base"
                )}>
                  {decisionExplanation}
                </div>
              </div>
            )}

            {/* Key Points */}
            {keyPoints.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                <div className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                  Key Points
                </div>
                <ul className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-cyan-400 text-lg leading-none mt-0.5">•</span>
                      <span className="text-slate-300 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Common Mistakes */}
            {commonMistakes.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                <div className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                  Common Mistakes
                </div>
                <ul className="space-y-2">
                  {commonMistakes.map((mistake, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-orange-400 text-lg leading-none mt-0.5">•</span>
                      <span className="text-slate-300 leading-relaxed">{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* VAR Notes */}
            {varRelevant && varNotes && (
              <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-500/30">
                <div className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                  VAR Protocol
                </div>
                <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {varNotes}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-cyan-500/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm uppercase tracking-wide rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
