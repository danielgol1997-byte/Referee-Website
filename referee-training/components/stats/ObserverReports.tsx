"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { type Season } from "@/lib/stats-mock";
import {
  formatReportDate,
  getObserverReports,
  RATING_META,
  type ObserverReport,
  type Rating,
} from "@/lib/observer-reports-mock";
import { ScoreBadge } from "./ScoreBadge";

const DIFFICULTY_STYLE: Record<string, string> = {
  Normal: "border-dark-500 bg-dark-700/60 text-text-secondary",
  "Quite challenging": "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]",
  "Very challenging": "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171]",
};

function RatingPill({ label, rating }: { label: string; rating: Rating }) {
  const meta = RATING_META[rating];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] leading-tight ${meta.class}`}
    >
      <span className="font-bold">{meta.symbol}</span>
      {label}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dark-600 bg-dark-900/50 px-2 py-0.5 text-[11px] text-text-secondary">
      <span className={`font-bold tabular-nums ${tone ?? "text-text-primary"}`}>{value}</span>
      {label}
    </span>
  );
}

function ReportBody({ report }: { report: ObserverReport }) {
  return (
    <div className="space-y-4 border-t border-dark-600 bg-dark-900/40 p-4">
      {/* Venue + match statistics */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-dark-600 bg-dark-900/50 px-2 py-0.5 text-[11px] text-text-muted">
          {report.stadium}, {report.city}
        </span>
        <Stat label="yellow" value={report.cards.yellow} tone="text-[#fbbf24]" />
        {report.cards.red > 0 && <Stat label="red" value={report.cards.red} tone="text-[#f87171]" />}
        {report.cards.missed > 0 && (
          <Stat label="missed" value={report.cards.missed} tone="text-[#f87171]" />
        )}
        <Stat label="pen. awarded" value={report.penalties.awarded} />
        <Stat label="correct calls" value={report.penalties.correct} tone="text-[#4ade80]" />
      </div>

      {/* The six assessment sections */}
      <div className="grid gap-3 sm:grid-cols-2">
        {report.sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-dark-600 bg-dark-900/30 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-primary">{section.title}</p>
              {section.net !== 0 && (
                <span
                  className={`shrink-0 text-[11px] font-bold tabular-nums ${
                    section.net > 0 ? "text-[#4ade80]" : "text-[#fbbf24]"
                  }`}
                >
                  {section.net > 0 ? `+${section.net}` : section.net}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {section.items.map((it) => (
                <RatingPill key={it.label} label={it.label} rating={it.rating} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main incidents */}
      {report.mainIncidents.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Main incidents
          </p>
          {report.mainIncidents.map((inc, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0 rounded bg-dark-700 px-1.5 py-0.5 font-bold tabular-nums text-text-secondary">
                {inc.minute}&apos;
              </span>
              <span className="shrink-0 font-medium text-cyan-400">{inc.type}</span>
              <span className="text-text-secondary">{inc.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* General comments */}
      <div className="space-y-2 border-t border-dark-600/60 pt-3">
        <p className="text-sm leading-relaxed text-text-secondary">{report.comments}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4ade80]">
              Positives
            </span>
            {report.positives.map((p) => (
              <span
                key={p}
                className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 py-0.5 text-[11px] text-[#4ade80]"
              >
                {p}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#fbbf24]">
              To improve
            </span>
            {report.improvements.map((p) => (
              <span
                key={p}
                className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2 py-0.5 text-[11px] text-[#fbbf24]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ObserverReports({
  refereeId,
  season,
}: {
  refereeId: string;
  season: Season;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reports = getObserverReports(refereeId, season);

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Post-match observer reports from {season}, on the UEFA template. Click a report for the full
        section-by-section assessment.
      </p>

      <div className="space-y-3">
        {reports.map((report) => {
          const isOpen = openId === report.id;
          return (
            <Card
              key={report.id}
              padded={false}
              hoverable
              className={`overflow-hidden ${isOpen ? "border-cyan-500/40 shadow-glow" : ""}`}
              onClick={() => setOpenId(isOpen ? null : report.id)}
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <span className="truncate">
                      {report.homeTeam}{" "}
                      <span className="tabular-nums text-text-secondary">
                        {report.homeScore}–{report.awayScore}
                      </span>{" "}
                      {report.awayTeam}
                    </span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
                    <span>{report.competition}</span>
                    <span>·</span>
                    <span>{report.round}</span>
                    <span>·</span>
                    <span>{formatReportDate(report.date)}</span>
                    <span>·</span>
                    <span>Obs. {report.observer}</span>
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${
                      DIFFICULTY_STYLE[report.difficulty] ?? DIFFICULTY_STYLE.Normal
                    }`}
                  >
                    {report.difficulty}
                  </span>
                  <ScoreBadge score={report.mark} decimals={1} />
                  <svg
                    className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <ReportBody report={report} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
