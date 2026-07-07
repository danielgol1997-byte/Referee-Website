"use client";

import { useEffect, useState } from "react";
import { type Season } from "@/lib/stats-mock";
import {
  ALIGNMENT_META,
  getAiAnalysis,
  getCorrelation,
  type CorrelationPoint,
} from "@/lib/observer-reports-mock";
import { InfoTip } from "./InfoTip";

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

  // Re-run the "analysis" whenever referee or season changes.
  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setPhase(i + 1), (i + 1) * STEP_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [runKey]);

  const analysis = getAiAnalysis(refereeId, season);
  const correlation = getCorrelation(refereeId, season);

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
            <AnalysisOutput analysis={analysis} correlation={correlation} />
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
  correlation,
}: {
  analysis: ReturnType<typeof getAiAnalysis>;
  correlation: CorrelationPoint[];
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <p className="text-[15px] leading-relaxed text-text-secondary">{analysis.summary}</p>

      {/* Strength / focus chips */}
      <div className="flex flex-wrap gap-2">
        {analysis.strengths.map((s) => (
          <span
            key={s.slug}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-medium text-[#4ade80]"
          >
            <span className="text-[10px]">▲</span>
            {s.name}
            <span className="tabular-nums opacity-80">{s.mark.toFixed(1)}</span>
          </span>
        ))}
        {analysis.focus.map((f) => (
          <span
            key={f.slug}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-xs font-medium text-[#fbbf24]"
          >
            <span className="text-[10px]">◆</span>
            {f.name}
            <span className="tabular-nums opacity-80">{f.mark.toFixed(1)}</span>
          </span>
        ))}
      </div>

      {/* Correlation chart */}
      <div className="rounded-xl border border-dark-600 bg-dark-900/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            Match reports vs test results
            <InfoTip text="Each row compares the observer's match mark (gold) with the platform test mark (cyan) for that criteria. Bigger gaps mean less alignment." />
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Test
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Match
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {correlation.map((point, i) => (
            <CorrelationRow key={point.slug} point={point} index={i} />
          ))}
        </div>

        <div className="mt-3 flex justify-between px-[110px] text-[10px] text-text-muted">
          <span>5.0</span>
          <span>7.5</span>
          <span>10.0</span>
        </div>
      </div>
    </div>
  );
}

const SCALE_MIN = 5;
const SCALE_MAX = 10;
function pos(value: number): number {
  return Math.max(0, Math.min(100, ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));
}

function CorrelationRow({ point, index }: { point: CorrelationPoint; index: number }) {
  const [hovered, setHovered] = useState(false);
  const testX = pos(point.testMark);
  const reportX = pos(point.reportMark);
  const left = Math.min(testX, reportX);
  const width = Math.abs(testX - reportX);
  const meta = ALIGNMENT_META[point.alignment];

  return (
    <div className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
      <span className="truncate text-xs text-text-secondary">{point.name}</span>

      <div
        className="relative h-6"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Base track */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-dark-700" />
        {/* Gap connector */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/50 to-[#f59e0b]/50 transition-all duration-700 ease-out"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        {/* Test dot */}
        <Dot xPct={testX} color="#00E8F8" delay={index * 60} />
        {/* Report dot */}
        <Dot xPct={reportX} color="#f59e0b" delay={index * 60 + 120} />

        {hovered && (
          <div className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-[10px] font-semibold text-text-primary shadow-elevated">
            Test {point.testMark.toFixed(1)} · Match {point.reportMark.toFixed(1)}
          </div>
        )}
      </div>

      <span
        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}
      >
        {meta.label}
      </span>
    </div>
  );
}

function Dot({ xPct, color, delay }: { xPct: number; color: string; delay: number }) {
  return (
    <div
      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dark-800 shadow transition-all duration-700 ease-out"
      style={{ left: `${xPct}%`, backgroundColor: color, transitionDelay: `${delay}ms` }}
    />
  );
}
