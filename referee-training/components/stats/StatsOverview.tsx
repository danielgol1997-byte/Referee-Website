"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatScore,
  getRefereeOverall,
  getTestsTaken,
  type StatReferee,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { InfoTip } from "./InfoTip";
import { scoreTextColor } from "./score-utils";

export function StatsOverview({ referees = STAT_REFEREES }: { referees?: StatReferee[] }) {
  const totalTests = useMemo(
    () =>
      referees.reduce(
        (sum, r) => sum + STAT_CATEGORIES.reduce((s, c) => s + getTestsTaken(r.id, c.slug), 0),
        0
      ),
    [referees]
  );

  const averageMark =
    referees.length === 0
      ? 0
      : referees.reduce((sum, r) => sum + getRefereeOverall(r), 0) / referees.length;

  const categoryAverages = useMemo(
    () =>
      STAT_CATEGORIES.map((c) => {
        const vals = referees.map((r) => r.scores[c.slug] ?? 0);
        const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return { category: c, avg };
      }).sort((a, b) => b.avg - a.avg),
    [referees]
  );

  return (
    <div className="space-y-6">
      {/* Hero metrics (respond to filters) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Referees</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber key={referees.length} value={referees.length} />
          </p>
          <p className="text-xs text-text-muted">in current scope</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Tests completed</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber key={totalTests} value={totalTests} />
          </p>
          <p className="text-xs text-text-muted">across all categories</p>
        </Card>
        <Card className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm text-text-secondary">
            Average mark
            <InfoTip text="Mean of the selected referees' test marks, across all categories. Scored out of 10." />
          </p>
          <p className={`text-3xl font-bold ${scoreTextColor(averageMark)}`}>
            <AnimatedNumber key={averageMark.toFixed(2)} value={averageMark} decimals={2} />
          </p>
          <p className="text-xs text-text-muted">all referees in scope</p>
        </Card>
      </div>

      {/* Average mark by category (respond to filters) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-text-primary">
            Average mark by category
            <InfoTip text="Average test mark per category for the referees currently selected." />
          </h2>
          <span className="text-xs text-text-muted">out of 10</span>
        </div>

        {referees.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            No referees match these filters.
          </p>
        ) : (
          <div className="space-y-2.5">
            {categoryAverages.map(({ category, avg }) => (
              <div key={category.slug} className="flex items-center gap-3">
                <span className="w-32 flex-shrink-0 truncate text-sm text-text-secondary">
                  {category.name}
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-dark-900/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500/70 to-cyan-500 transition-all duration-700 ease-out"
                    style={{ width: `${(avg / 10) * 100}%` }}
                  />
                </div>
                <span
                  className={`w-12 flex-shrink-0 text-right text-sm font-bold tabular-nums ${scoreTextColor(avg)}`}
                >
                  {formatScore(avg)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
