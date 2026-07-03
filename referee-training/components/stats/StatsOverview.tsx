"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatScore,
  getCategoryAverage,
  getCategoryTestsTaken,
  getCategoryTrend,
  getSiteAverage,
  getTotalTests,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { DistributionBar, DistributionLegend } from "./DistributionBar";
import { Sparkline } from "./Sparkline";
import { scoreTextColor } from "./score-utils";

export function StatsOverview() {
  const totalTests = getTotalTests();
  const siteAverage = getSiteAverage();
  const bestCategory = [...STAT_CATEGORIES].sort(
    (a, b) => getCategoryAverage(b.slug) - getCategoryAverage(a.slug)
  )[0];

  return (
    <div className="space-y-8">
      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Tests completed</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber value={totalTests} />
          </p>
          <p className="text-xs text-text-muted">across all categories</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Average mark</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber value={siteAverage} decimals={2} />
          </p>
          <p className="text-xs text-text-muted">all referees, all categories</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Referees tracked</p>
          <p className="text-3xl font-bold text-cyan-500">
            <AnimatedNumber value={STAT_REFEREES.length} />
          </p>
          <p className="text-xs text-text-muted">active this season</p>
        </Card>
        <Link href={`/stats/category/${bestCategory.slug}`} className="group">
          <Card hoverable className="h-full space-y-1">
            <p className="text-sm text-text-secondary">Strongest category</p>
            <p className="text-2xl font-bold text-accent group-hover:text-accent-dark transition-colors">
              {bestCategory.name}
            </p>
            <p className="text-xs text-text-muted">
              ave. mark{" "}
              <span className={scoreTextColor(getCategoryAverage(bestCategory.slug))}>
                {formatScore(getCategoryAverage(bestCategory.slug))}
              </span>{" "}
              →
            </p>
          </Card>
        </Link>
      </div>

      {/* Answer distribution per category */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Answers by category</h2>
            <p className="mt-1 text-sm text-text-secondary">
              How all referees answered across every test. Click a category to drill down.
            </p>
          </div>
          <DistributionLegend />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STAT_CATEGORIES.map((category, i) => {
            const average = getCategoryAverage(category.slug);
            const tests = getCategoryTestsTaken(category.slug);
            const trend = getCategoryTrend(category.slug);
            return (
              <Link
                key={category.slug}
                href={`/stats/category/${category.slug}`}
                className="group animate-slide-up"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <Card hoverable className="h-full space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-cyan-500">
                        {category.short}
                      </p>
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {category.name}
                      </h3>
                    </div>
                    <span
                      className={`text-2xl font-bold tabular-nums ${scoreTextColor(average)}`}
                    >
                      {formatScore(average)}
                    </span>
                  </div>

                  <DistributionBar distribution={category.distribution} showLabels />

                  <div className="flex items-end justify-between gap-3 pt-1">
                    <p className="text-xs text-text-muted">
                      {tests} tests · {STAT_REFEREES.length} referees
                    </p>
                    <div className="w-24 flex-shrink-0">
                      <Sparkline values={trend} height={26} />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
