"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  COUNTRY_FLAGS,
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatScore,
  getCategoryAverage,
  getCategoryLeaderboard,
  getCategoryTestsTaken,
  getCategoryTrend,
  getRefereeDistribution,
  getTestsTaken,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { DistributionBar, DistributionLegend } from "./DistributionBar";
import { TrendChart } from "./TrendChart";
import { ScoreBadge } from "./ScoreBadge";
import { InfoTip } from "./InfoTip";
import { scoreTextColor } from "./score-utils";

const WEEK_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"];

export function CategoryStatsView({ slug }: { slug: string }) {
  const router = useRouter();
  const index = STAT_CATEGORIES.findIndex((c) => c.slug === slug);
  const category = STAT_CATEGORIES[index];
  const previous = STAT_CATEGORIES[(index - 1 + STAT_CATEGORIES.length) % STAT_CATEGORIES.length];
  const next = STAT_CATEGORIES[(index + 1) % STAT_CATEGORIES.length];

  const average = getCategoryAverage(slug);
  const tests = getCategoryTestsTaken(slug);
  const trend = getCategoryTrend(slug);
  const leaderboard = getCategoryLeaderboard(slug);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Breadcrumb + prev/next navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <nav className="flex items-center gap-2 text-text-muted">
          <Link href="/stats" className="transition-colors hover:text-accent">
            Statistics
          </Link>
          <span>/</span>
          <Link href="/stats?tab=categories" className="transition-colors hover:text-accent">
            Categories
          </Link>
          <span>/</span>
          <span className="font-medium text-text-primary">{category.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={`/stats/category/${previous.slug}`}
            className="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent/40 hover:text-accent"
          >
            ← {previous.name}
          </Link>
          <Link
            href={`/stats/category/${next.slug}`}
            className="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent/40 hover:text-accent"
          >
            {next.name} →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
        <p className="text-xs uppercase tracking-widest text-cyan-500">{category.short}</p>
        <h1 className="text-3xl font-bold text-premium">{category.name}</h1>
        <p className="mt-2 text-text-secondary">
          Site-wide performance in {category.name} tests
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Average mark</p>
          <p className={`text-3xl font-bold ${scoreTextColor(average)}`}>
            <AnimatedNumber value={average} decimals={2} />
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Tests completed</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber value={tests} />
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Top referee</p>
          <Link
            href={`/stats/referee/${leaderboard[0].id}/category/${slug}`}
            className="block text-xl font-bold text-accent transition-colors hover:text-accent-dark"
          >
            {leaderboard[0].name} →
          </Link>
          <p className="text-xs text-text-muted">
            {COUNTRY_FLAGS[leaderboard[0].country]} {leaderboard[0].country} · ave.{" "}
            {formatScore(leaderboard[0].scores[slug] ?? 0)}
          </p>
        </Card>
      </div>

      {/* Distribution + trend */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-lg font-semibold text-text-primary">
              Answer distribution
              <InfoTip text="How all answers in this category split between correct, partially correct, and incorrect." />
            </h2>
            <p className="mt-1 text-sm text-text-secondary">All referees, all tests</p>
          </div>
          <DistributionBar distribution={category.distribution} size="lg" showLabels />
          <DistributionLegend className="pt-1" />
        </Card>
        <Card className="space-y-3 lg:col-span-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Average mark trend</h2>
            <p className="mt-1 text-sm text-text-secondary">Last 10 weeks — hover for details</p>
          </div>
          <TrendChart
            points={trend.map((value, i) => ({ label: WEEK_LABELS[i], value }))}
            valueFormatter={(v) => `Ave. mark ${v.toFixed(2)}`}
          />
        </Card>
      </div>

      {/* Ranking table (deck slide: Referee / Country / Category / Tests made / Ave. mark) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Ranking</h2>
          <p className="mt-1 text-sm text-text-secondary">
            All {STAT_REFEREES.length} referees, ranked by average mark in {category.name}. Click a
            row for the referee&apos;s full record.
          </p>
        </div>
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-dark-600 bg-dark-700 text-left text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Referee</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-center font-medium">Tests made</th>
                  <th className="px-4 py-3 font-medium">Answers</th>
                  <th className="px-4 py-3 text-center font-medium">Ave. mark</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((referee, rank) => (
                  <tr
                    key={referee.id}
                    onClick={() => router.push(`/stats/referee/${referee.id}/category/${slug}`)}
                    className="group cursor-pointer border-t border-dark-600 transition-colors hover:bg-dark-700/60"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold tabular-nums ${rank === 0 ? "text-accent" : "text-text-muted"}`}
                      >
                        {rank + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary transition-colors group-hover:text-accent">
                      {referee.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      <span className="mr-1.5">{COUNTRY_FLAGS[referee.country]}</span>
                      {referee.country}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-500">
                        {referee.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-text-secondary">
                      {getTestsTaken(referee.id, slug)}
                    </td>
                    <td className="min-w-[140px] px-4 py-3">
                      <DistributionBar
                        distribution={getRefereeDistribution(referee.id, slug)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={referee.scores[slug] ?? 0} className="group-hover:scale-105" />
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
