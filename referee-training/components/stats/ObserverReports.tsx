"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { type Season } from "@/lib/stats-mock";
import {
  REPORT_CRITERIA,
  formatReportDate,
  getObserverReports,
} from "@/lib/observer-reports-mock";
import { ScoreBadge } from "./ScoreBadge";
import { scoreTextColor } from "./score-utils";

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
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Every marked match report from {season}. Click a report to read the observer&apos;s notes.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((report) => {
          const isOpen = openId === report.id;
          return (
            <Card
              key={report.id}
              padded={false}
              hoverable
              className={`h-fit ${isOpen ? "border-cyan-500/40 shadow-glow" : ""}`}
              onClick={() => setOpenId(isOpen ? null : report.id)}
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {report.fixture}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {report.competition} · {formatReportDate(report.date)} · Obs. {report.observer}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <ScoreBadge score={report.overall} decimals={1} />
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
                  <div className="space-y-3 border-t border-dark-600 bg-dark-900/40 p-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                      {REPORT_CRITERIA.map((crit) => (
                        <div key={crit.slug} className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-text-secondary">{crit.name}</span>
                          <span
                            className={`text-xs font-bold tabular-nums ${scoreTextColor(report.marks[crit.slug])}`}
                          >
                            {report.marks[crit.slug].toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="border-t border-dark-600/60 pt-3 text-sm leading-relaxed text-text-secondary">
                      {report.text}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
