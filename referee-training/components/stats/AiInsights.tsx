"use client";

import { useEffect, useState } from "react";
import { type Season } from "@/lib/stats-mock";
import { getAiAnalysis, getComparison } from "@/lib/observer-reports-mock";
import { InfoTip } from "./InfoTip";
import { TestVsMatch } from "./TestVsMatch";

const LOADING_STEPS = [
  "Reading observer reports",
  "Extracting recurring themes",
  "Correlating with test results",
];
const STEP_MS = 850;

export function AiInsights({
  refereeId,
  season,
}: {
  refereeId: string;
  season: Season;
}) {
  // Number of completed loading steps. Reveal once all steps finish.
  const [phase, setPhase] = useState(0);
  const done = phase >= LOADING_STEPS.length;

  // Reset the sequence during render when referee/season changes
  // (the sanctioned React pattern — avoids a synchronous setState in an effect).
  const runKey = `${refereeId}:${season}`;
  const [prevKey, setPrevKey] = useState(runKey);
  if (prevKey !== runKey) {
    setPrevKey(runKey);
    setPhase(0);
  }

  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setPhase(i + 1), (i + 1) * STEP_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [runKey]);

  const analysis = getAiAnalysis(refereeId, season);
  const comparison = getComparison(refereeId, season);

  return (
    <div className="relative overflow-hidden rounded-2xl p-[1px]">
      {/* Animated gradient border */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(110deg, rgba(0,232,248,0.5), rgba(237,229,140,0.5), rgba(0,232,248,0.5))",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />
      <div className="relative rounded-2xl bg-dark-800 p-6">
        {/* Header */}
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-premium">
            <span className="text-cyan-500">✦</span>
            AI Performance Analysis
            <InfoTip text="A generated read of this referee's observer reports, cross-checked against their platform test results." />
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Generated from observer reports + test data · {season}
          </p>
        </div>

        <div className="mt-5">
          {done ? (
            <AnalysisOutput analysis={analysis} comparison={comparison} />
          ) : (
            <LoadingSequence phase={phase} reportCount={analysis.reportCount} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Loading ---------- */

function LoadingSequence({ phase, reportCount }: { phase: number; reportCount: number }) {
  const labels = [
    `Reading ${reportCount} observer reports`,
    "Extracting recurring themes",
    "Correlating with test results",
  ];
  return (
    <div className="space-y-5 animate-fade-in">
      <ol className="space-y-2.5">
        {labels.map((label, i) => {
          const complete = phase > i;
          const active = phase === i;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                  complete
                    ? "border-[#22c55e]/40 bg-[#22c55e]/15 text-[#4ade80]"
                    : active
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                      : "border-dark-600 text-text-muted"
                }`}
              >
                {complete ? (
                  "✓"
                ) : active ? (
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={
                  complete
                    ? "text-text-secondary"
                    : active
                      ? "font-medium text-text-primary"
                      : "text-text-muted"
                }
              >
                {label}
                {active && <span className="ml-1 animate-pulse">…</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Shimmer skeleton of the forthcoming output */}
      <div className="space-y-2">
        {[100, 92, 78].map((w, i) => (
          <ShimmerBar key={i} widthPct={w} />
        ))}
      </div>
    </div>
  );
}

function ShimmerBar({ widthPct }: { widthPct: number }) {
  return (
    <div
      className="h-3 rounded-full animate-shimmer"
      style={{
        width: `${widthPct}%`,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.04) 63%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

/* ---------- Output ---------- */

function AnalysisOutput({
  analysis,
  comparison,
}: {
  analysis: ReturnType<typeof getAiAnalysis>;
  comparison: ReturnType<typeof getComparison>;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <p className="text-[15px] leading-relaxed text-text-secondary">{analysis.summary}</p>

      {/* Strength / focus chips (labelled by match index) */}
      <div className="flex flex-wrap gap-2">
        {analysis.strengths.map((s) => (
          <span
            key={s.slug}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-medium text-[#4ade80]"
          >
            <span className="text-[10px]">▲</span>
            {s.name}
            <span className="tabular-nums opacity-80">{s.matchIndex}</span>
          </span>
        ))}
        {analysis.focus.map((f) => (
          <span
            key={f.slug}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-xs font-medium text-[#fbbf24]"
          >
            <span className="text-[10px]">◆</span>
            {f.name}
            <span className="tabular-nums opacity-80">{f.matchIndex}</span>
          </span>
        ))}
      </div>

      {/* Tests vs match on the Performance Index */}
      <TestVsMatch
        comparison={comparison}
        consistency={analysis.consistency}
        headline={analysis.alignmentHeadline}
      />
    </div>
  );
}
