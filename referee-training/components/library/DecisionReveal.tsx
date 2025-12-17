"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DecisionRevealProps {
  correctDecision: string;
  decisionExplanation?: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  lawNumbers?: number[];
  sanctionType?: string;
  restartType?: string;
  varRelevant?: boolean;
  varNotes?: string;
  onReveal?: () => void;
}

export function DecisionReveal({
  correctDecision,
  decisionExplanation,
  keyPoints = [],
  commonMistakes = [],
  lawNumbers = [],
  sanctionType,
  restartType,
  varRelevant = false,
  varNotes,
  onReveal
}: DecisionRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    setIsRevealed(true);
    onReveal?.();
  };

  const formatSanction = (type?: string) => {
    if (!type || type === 'NO_CARD') return 'No Card';
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const formatRestart = (type?: string) => {
    if (!type) return null;
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  if (!isRevealed) {
    return (
      <div className="w-full">
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-dark-800/90 to-dark-700/90",
          "border border-dark-600",
          "p-8 text-center"
        )}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-text-primary mb-3">
              What is your decision?
            </h3>
            
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Watch the clip carefully and make your decision. Click below to see the correct call and explanation.
            </p>

            <button
              onClick={handleReveal}
              className={cn(
                "group relative px-8 py-4 rounded-xl font-semibold text-lg",
                "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900",
                "hover:from-cyan-400 hover:to-cyan-500",
                "transition-all duration-300",
                "shadow-lg hover:shadow-2xl hover:shadow-cyan-500/30",
                "transform hover:scale-105 active:scale-95"
              )}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Show Correct Decision
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in-0 slide-in-from-top-4 duration-500">
      {/* Correct Decision Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-green-500/10 to-emerald-500/10",
        "border border-green-500/30",
        "p-6"
      )}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">Correct Decision</h3>
            <p className="text-2xl font-bold text-text-primary mb-3">{correctDecision}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {restartType && (
                <div className="flex items-center gap-1 text-text-secondary">
                  <span className="text-cyan-500">🔄</span>
                  <span>Restart: <span className="text-cyan-400 font-medium">{formatRestart(restartType)}</span></span>
                </div>
              )}
              {lawNumbers.length > 0 && (
                <div className="flex items-center gap-1 text-text-secondary">
                  <span className="text-warm">📖</span>
                  <span>Law{lawNumbers.length > 1 ? 's' : ''}: <span className="text-warm font-medium">{lawNumbers.join(', ')}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {decisionExplanation && (
        <div className="rounded-2xl bg-dark-800/90 border border-dark-600 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📋</span>
            <h4 className="text-lg font-semibold text-text-primary">Explanation</h4>
          </div>
          <p className="text-text-secondary leading-relaxed">{decisionExplanation}</p>
        </div>
      )}

      {/* Key Decision Points */}
      {keyPoints.length > 0 && (
        <div className="rounded-2xl bg-dark-800/90 border border-dark-600 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💡</span>
            <h4 className="text-lg font-semibold text-text-primary">Key Decision Points</h4>
          </div>
          <ul className="space-y-2">
            {keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-secondary">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Mistakes */}
      {commonMistakes.length > 0 && (
        <div className="rounded-2xl bg-dark-800/90 border border-dark-600 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span>
            <h4 className="text-lg font-semibold text-text-primary">Common Mistakes</h4>
          </div>
          <ul className="space-y-2">
            {commonMistakes.map((mistake, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-text-secondary">{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* VAR Protocol */}
      {varRelevant && (
        <div className="rounded-2xl bg-purple-500/10 border border-purple-500/30 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎬</span>
            <h4 className="text-lg font-semibold text-purple-400">VAR Protocol</h4>
          </div>
          <p className="text-text-secondary leading-relaxed">
            {varNotes || "This is a VAR reviewable incident. VAR would check for clear and obvious error in the referee's decision."}
          </p>
        </div>
      )}

      {/* Hide Button */}
      <div className="text-center pt-2">
        <button
          onClick={() => setIsRevealed(false)}
          className="text-sm text-text-muted hover:text-cyan-500 transition-colors duration-300"
        >
          Hide Decision
        </button>
      </div>
    </div>
  );
}
