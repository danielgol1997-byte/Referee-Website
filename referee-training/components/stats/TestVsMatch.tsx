"use client";

import { useState } from "react";
import {
  ALIGNMENT_META,
  EXPECTED_INDEX,
  indexColor,
} from "@/lib/performance-index";
import type { ComparisonPoint } from "@/lib/observer-reports-mock";
import { InfoTip } from "./InfoTip";

/* ---------- Consistency headline ---------- */

function consistencyTone(score: number): string {
  if (score >= 85) return "#4ade80";
  if (score >= 70) return "#00E8F8";
  if (score >= 55) return "#fbbf24";
  return "#f87171";
}

/* ---------- Theory-vs-Pitch quadrant map ---------- */

function QuadrantMap({ comparison }: { comparison: ComparisonPoint[] }) {
  const [active, setActive] = useState<string | null>(null);
  // Benchmark (70) as a percentage of the 0–100 axis.
  const bench = EXPECTED_INDEX;

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-[340px] rounded-xl border border-dark-600 bg-dark-900/40">
        {/* Quadrant tint + guide lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* benchmark lines (x=70, y=70) */}
          <line x1={bench} y1={0} x2={bench} y2={100} stroke="#00E8F8" strokeWidth={0.4} strokeDasharray="2 2" opacity={0.4} />
          <line x1={0} y1={100 - bench} x2={100} y2={100 - bench} stroke="#00E8F8" strokeWidth={0.4} strokeDasharray="2 2" opacity={0.4} />
          {/* perfect-alignment diagonal (match index = test index) */}
          <line x1={0} y1={100} x2={100} y2={0} stroke="#ffffff" strokeWidth={0.4} strokeDasharray="1.5 2" opacity={0.18} />
        </svg>

        {/* Quadrant labels */}
        <span className="pointer-events-none absolute right-2 top-2 text-right text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#4ade80]/70">
          Strong<br />all-round
        </span>
        <span className="pointer-events-none absolute left-2 top-2 text-left text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#fbbf24]/70">
          Pitch ahead<br />of theory
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 text-right text-[9px] font-semibold uppercase leading-tight tracking-wide text-cyan-500/70">
          Theory ahead<br />of pitch
        </span>
        <span className="pointer-events-none absolute bottom-2 left-2 text-left text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#f87171]/60">
          Priority<br />area
        </span>

        {/* Points */}
        {comparison.map((p) => {
          const isActive = active === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onMouseEnter={() => setActive(p.slug)}
              onMouseLeave={() => setActive((s) => (s === p.slug ? null : s))}
              onFocus={() => setActive(p.slug)}
              onBlur={() => setActive((s) => (s === p.slug ? null : s))}
              className="absolute -translate-x-1/2 translate-y-1/2 focus:outline-none"
              style={{ left: `${p.testIndex}%`, bottom: `${p.matchIndex}%` }}
              aria-label={`${p.name}: test ${p.testIndex}, match ${p.matchIndex}`}
            >
              <span
                className="block rounded-full border-2 border-dark-900 transition-all duration-200"
                style={{
                  width: isActive ? 15 : 11,
                  height: isActive ? 15 : 11,
                  backgroundColor: indexColor((p.testIndex + p.matchIndex) / 2),
                  boxShadow: isActive ? `0 0 0 4px ${ALIGNMENT_META[p.alignment].dot}33` : "none",
                }}
              />
              {isActive && (
                <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-[10px] font-semibold text-text-primary shadow-elevated">
                  {p.name} · test {p.testMark.toFixed(1)} · match {p.matchMark.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Axis labels */}
      <div className="mt-2 flex w-full max-w-[340px] items-center justify-between text-[10px] text-text-muted">
        <span>← knowledge</span>
        <span className="font-medium text-text-secondary">Test index (theory) →</span>
      </div>
      <p className="mt-0.5 text-[10px] text-text-muted">
        Vertical axis: match index (pitch) · dashed lines mark the {EXPECTED_INDEX} expected level
      </p>
    </div>
  );
}

/* ---------- Per-criterion dumbbell ---------- */

function CompareRow({ point }: { point: ComparisonPoint }) {
  const [hovered, setHovered] = useState(false);
  const left = Math.min(point.testIndex, point.matchIndex);
  const width = Math.abs(point.testIndex - point.matchIndex);
  const meta = ALIGNMENT_META[point.alignment];

  return (
    <div className="grid grid-cols-[92px_1fr_92px] items-center gap-3">
      <span className="truncate text-xs text-text-secondary" title={point.section}>
        {point.name}
      </span>

      <div
        className="relative h-6"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-dark-700" />
        {/* expected benchmark tick */}
        <div
          className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-cyan-500/40"
          style={{ left: `${EXPECTED_INDEX}%` }}
        />
        {/* gap connector */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/50 to-[#f59e0b]/50 transition-all duration-700 ease-out"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <Dot xPct={point.testIndex} color="#00E8F8" />
        <Dot xPct={point.matchIndex} color="#f59e0b" />

        {hovered && (
          <div className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-[10px] font-semibold text-text-primary shadow-elevated">
            Test {point.testMark.toFixed(1)} → {point.testIndex} · Match {point.matchMark.toFixed(1)} → {point.matchIndex}
          </div>
        )}
      </div>

      <span
        className={`justify-self-end whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}
      >
        {meta.short}
      </span>
    </div>
  );
}

function Dot({ xPct, color }: { xPct: number; color: string }) {
  return (
    <div
      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dark-800 shadow transition-all duration-700 ease-out"
      style={{ left: `${xPct}%`, backgroundColor: color }}
    />
  );
}

/* ---------- Full widget ---------- */

export function TestVsMatch({
  comparison,
  consistency,
  headline,
}: {
  comparison: ComparisonPoint[];
  consistency: number;
  headline: string;
}) {
  return (
    <div className="rounded-xl border border-dark-600 bg-dark-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            Tests vs match performance
            <InfoTip text="Both scales are converted to a 0–100 Performance Index where 70 = expected. This makes platform test marks and UEFA match marks directly comparable." />
          </h3>
          <p className="mt-0.5 max-w-md text-xs text-text-secondary">{headline}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">Consistency</p>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: consistencyTone(consistency) }}
          >
            {consistency}
            <span className="text-sm text-text-muted">/100</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <QuadrantMap comparison={comparison} />

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Test (theory)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Match (pitch)
            </span>
            <span className="ml-auto text-text-muted">0–100 index · 70 = expected</span>
          </div>
          {comparison.map((point) => (
            <CompareRow key={point.slug} point={point} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Compact single-criterion compare (category page) ---------- */

export function CriterionCompare({ point }: { point: ComparisonPoint }) {
  const meta = ALIGNMENT_META[point.alignment];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
        >
          {meta.label}
        </span>
        <span className="text-[11px] text-text-muted">0–100 index · 70 = expected</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IndexTile label="Test (theory)" mark={point.testMark} index={point.testIndex} color="#00E8F8" />
        <IndexTile label="Match (pitch)" mark={point.matchMark} index={point.matchIndex} color="#f59e0b" />
      </div>

      <CompareRow point={point} />
    </div>
  );
}

function IndexTile({
  label,
  mark,
  index,
  color,
}: {
  label: string;
  mark: number;
  index: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-dark-600 bg-dark-900/40 p-3 text-center">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color }}>
        {index}
      </p>
      <p className="text-[11px] text-text-muted">mark {mark.toFixed(1)}</p>
    </div>
  );
}
