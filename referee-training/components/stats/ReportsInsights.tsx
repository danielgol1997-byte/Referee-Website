"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CURRENT_SEASON, SEASONS, type Season } from "@/lib/stats-mock";
import { getObserverReports } from "@/lib/observer-reports-mock";
import { AiInsights } from "./AiInsights";
import { ObserverReports } from "./ObserverReports";
import { GradingGuide } from "./GradingGuide";
import { InfoTip } from "./InfoTip";

type Tab = "ai" | "reports";

/**
 * Combines the AI analysis and the observer reports it's based on into one
 * section, sharing a single season filter.
 */
export function ReportsInsights({ refereeId }: { refereeId: string }) {
  const [season, setSeason] = useState<Season>(CURRENT_SEASON);
  const [tab, setTab] = useState<Tab>("ai");

  const reportCount = getObserverReports(refereeId, season).length;

  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { id: "ai", label: <><span className="text-cyan-500">✦</span> AI Analysis</> },
    {
      id: "reports",
      label: (
        <>
          Observer reports
          <span className="ml-1.5 rounded-full bg-dark-600 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
            {reportCount}
          </span>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Shared header: title + single season filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-xl font-semibold text-text-primary">
              Performance analysis
              <InfoTip text="An AI read of this season's observer reports, plus the reports it's based on. One season filter controls both tabs." />
            </h2>
            <GradingGuide />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            AI summary and the observer reports behind it
          </p>
        </div>
        <SegmentedControl
          value={season}
          onChange={(v) => setSeason(v as Season)}
          options={SEASONS.map((s) => ({ value: s, label: s }))}
        />
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center rounded-lg border border-dark-600 bg-dark-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-dark-700 text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      {tab === "ai" ? (
        <AiInsights refereeId={refereeId} season={season} />
      ) : (
        <ObserverReports refereeId={refereeId} season={season} />
      )}
    </div>
  );
}
