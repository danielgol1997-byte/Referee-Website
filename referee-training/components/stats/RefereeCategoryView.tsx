"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  COUNTRY_FLAGS,
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatHistoryDate,
  getRefereeDistribution,
  getTestHistory,
  getTestsTaken,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { CategoryTabs } from "./CategoryTabs";
import { DistributionBar, DistributionLegend } from "./DistributionBar";
import { TrendChart } from "./TrendChart";
import { InfoTip } from "./InfoTip";
import { scoreTextColor } from "./score-utils";

export function RefereeCategoryView({
  refereeId,
  slug,
  isOwnView = false,
}: {
  refereeId: string;
  slug: string;
  isOwnView?: boolean;
}) {
  const referee = STAT_REFEREES.find((r) => r.id === refereeId)!;
  const category = STAT_CATEGORIES.find((c) => c.slug === slug)!;

  const score = referee.scores[slug] ?? 0;
  const history = getTestHistory(refereeId, slug);
  const latest = history[history.length - 1];
  const distribution = getRefereeDistribution(refereeId, slug);
  const tests = getTestsTaken(refereeId, slug);
  // Rank only against referees in the same level (Elite, Category 1, ...).
  const levelPeers = STAT_REFEREES.filter((r) => r.level === referee.level);
  const categoryRank =
    [...levelPeers]
      .sort((a, b) => (b.scores[slug] ?? 0) - (a.scores[slug] ?? 0))
      .findIndex((r) => r.id === refereeId) + 1;

  const refereeHref = `/stats/referee/${refereeId}`;

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Breadcrumb + prev/next category (stays on this referee) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <nav className="flex flex-wrap items-center gap-2 text-text-muted">
          {isOwnView ? (
            <Link href={refereeHref} className="transition-colors hover:text-accent">
              My Stats
            </Link>
          ) : (
            <>
              <Link href="/stats" className="transition-colors hover:text-accent">
                Statistics
              </Link>
              <span>/</span>
              <Link href="/stats?tab=referees" className="transition-colors hover:text-accent">
                Referees
              </Link>
              <span>/</span>
              <Link href={refereeHref} className="transition-colors hover:text-accent">
                {referee.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-text-primary">{category.name}</span>
        </nav>
        {!isOwnView && (
          <Link
            href={`/stats/category/${slug}`}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-500 transition-all hover:bg-cyan-500/20"
          >
            See all referees in {category.name} →
          </Link>
        )}
      </div>

      {/* Category switcher — jump to any category, stays on this referee */}
      <CategoryTabs refereeId={refereeId} currentSlug={slug} />

      {/* Header — always anchored to this referee */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
          <p className="text-xs uppercase tracking-widest text-cyan-500">{category.short}</p>
          <h1 className="text-3xl font-bold text-premium">{category.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-text-secondary">
            <Link href={refereeHref} className="font-medium text-text-primary transition-colors hover:text-accent">
              {isOwnView ? "My results" : referee.name}
            </Link>
            {!isOwnView && (
              <span className="align-middle">{COUNTRY_FLAGS[referee.country]}</span>
            )}
            <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-500">
              {referee.level}
            </span>
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="flex items-center gap-1 text-sm text-text-secondary sm:justify-end">
            {category.name} ave. mark
            <InfoTip text="This referee's average test mark in this category, out of 10." />
          </p>
          <p className={`text-4xl font-bold tabular-nums ${scoreTextColor(score)}`}>
            <AnimatedNumber value={score} decimals={2} />
          </p>
        </div>
      </div>

      {/* Summary metrics for this referee in this category */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col items-center justify-center space-y-1 text-center">
          <p className="text-sm text-text-secondary">Tests completed</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber value={tests} />
          </p>
          <p className="text-xs text-text-muted">in {category.name}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center space-y-1 text-center">
          <p className="flex items-center justify-center gap-1 text-sm text-text-secondary">
            Category rank
            <InfoTip text={`Where this referee sits among ${referee.level} referees for this category.`} />
          </p>
          <p className="text-3xl font-bold text-accent tabular-nums">
            #{categoryRank}
            <span className="ml-1 text-base font-medium text-text-muted">
              of {levelPeers.length} in {referee.level}
            </span>
          </p>
        </Card>
        <Card className="flex flex-col items-center justify-center space-y-1 text-center">
          <p className="text-sm text-text-secondary">Latest test</p>
          <p className={`text-3xl font-bold tabular-nums ${scoreTextColor(latest.score)}`}>
            {latest.score}
          </p>
          <p className="text-xs text-text-muted">{formatHistoryDate(latest.date)}</p>
        </Card>
      </div>

      {/* Trend + distribution detail */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Answer distribution</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {isOwnView ? "My" : `${referee.name.split(" ")[0]}'s`} tests in {category.name}
            </p>
          </div>
          <DistributionBar distribution={distribution} size="lg" showLabels />
          <DistributionLegend className="pt-1" />
        </Card>
        <Card className="space-y-3 lg:col-span-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Mark trend</h2>
            <p className="mt-1 text-sm text-text-secondary">Last 10 tests — hover for details</p>
          </div>
          <TrendChart
            points={history.map((h) => ({ label: formatHistoryDate(h.date), value: h.score }))}
            valueFormatter={(v) => `Mark ${v.toFixed(0)}`}
          />
        </Card>
      </div>

      {/* Dated test history (this referee, this category) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Test history</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Every dated {category.name} test mark for {isOwnView ? "you" : referee.name}
          </p>
        </div>
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-dark-600 bg-dark-700 text-left text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Mark</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((entry, i) => (
                  <tr
                    key={i}
                    className="border-t border-dark-600 transition-colors hover:bg-dark-700/60"
                  >
                    <td className="px-4 py-3 text-text-secondary">{formatHistoryDate(entry.date)}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${scoreTextColor(entry.score)}`}
                    >
                      {entry.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}
