"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  COUNTRY_FLAGS,
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatHistoryDate,
  formatScore,
  getRefereeDistribution,
  getRefereeOverall,
  getTestHistory,
  getTestsTaken,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { DistributionBar, DistributionLegend } from "./DistributionBar";
import { Sparkline } from "./Sparkline";
import { ScoreBadge } from "./ScoreBadge";
import { scoreTextColor } from "./score-utils";

export function RefereeStatsView({ refereeId }: { refereeId: string }) {
  const index = STAT_REFEREES.findIndex((r) => r.id === refereeId);
  const referee = STAT_REFEREES[index];
  const previous = STAT_REFEREES[(index - 1 + STAT_REFEREES.length) % STAT_REFEREES.length];
  const next = STAT_REFEREES[(index + 1) % STAT_REFEREES.length];

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const overall = getRefereeOverall(referee);
  const rank =
    [...STAT_REFEREES]
      .sort((a, b) => getRefereeOverall(b) - getRefereeOverall(a))
      .findIndex((r) => r.id === refereeId) + 1;

  const sortedCategories = [...STAT_CATEGORIES].sort(
    (a, b) => (referee.scores[b.slug] ?? 0) - (referee.scores[a.slug] ?? 0)
  );
  const strongest = sortedCategories[0];
  const weakest = sortedCategories[sortedCategories.length - 1];
  const totalTests = STAT_CATEGORIES.reduce(
    (sum, c) => sum + getTestsTaken(referee.id, c.slug),
    0
  );

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Breadcrumb + prev/next navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <nav className="flex items-center gap-2 text-text-muted">
          <Link href="/stats" className="transition-colors hover:text-accent">
            Statistics
          </Link>
          <span>/</span>
          <Link href="/stats?tab=referees" className="transition-colors hover:text-accent">
            Referees
          </Link>
          <span>/</span>
          <span className="font-medium text-text-primary">{referee.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={`/stats/referee/${previous.id}`}
            className="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent/40 hover:text-accent"
          >
            ← {previous.name.split(" ")[0]}
          </Link>
          <Link
            href={`/stats/referee/${next.id}`}
            className="rounded-lg border border-dark-600 bg-dark-800/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-accent/40 hover:text-accent"
          >
            {next.name.split(" ")[0]} →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
          <h1 className="text-3xl font-bold text-premium">
            {referee.name}{" "}
            <span className="align-middle text-2xl">{COUNTRY_FLAGS[referee.country]}</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-text-secondary">
            {referee.country}
            <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-500">
              {referee.level}
            </span>
            <span className="text-text-muted">·</span>
            <span className="text-sm">
              Rank <span className="font-bold text-accent">#{rank}</span> of{" "}
              {STAT_REFEREES.length}
            </span>
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-text-secondary">Overall ave. mark</p>
          <p className={`text-4xl font-bold tabular-nums ${scoreTextColor(overall)}`}>
            <AnimatedNumber value={overall} decimals={2} />
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/stats/category/${strongest.slug}`} className="group">
          <Card hoverable className="h-full space-y-1">
            <p className="text-sm text-text-secondary">Strongest category</p>
            <p className="text-xl font-bold text-[#4ade80] transition-colors group-hover:text-accent">
              {strongest.name} →
            </p>
            <p className="text-xs text-text-muted">
              ave. mark {formatScore(referee.scores[strongest.slug] ?? 0)}
            </p>
          </Card>
        </Link>
        <Link href={`/stats/category/${weakest.slug}`} className="group">
          <Card hoverable className="h-full space-y-1">
            <p className="text-sm text-text-secondary">Focus area</p>
            <p className="text-xl font-bold text-[#f87171] transition-colors group-hover:text-accent">
              {weakest.name} →
            </p>
            <p className="text-xs text-text-muted">
              ave. mark {formatScore(referee.scores[weakest.slug] ?? 0)}
            </p>
          </Card>
        </Link>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Tests completed</p>
          <p className="text-xl font-bold text-cyan-500">
            <AnimatedNumber value={totalTests} />
          </p>
          <p className="text-xs text-text-muted">across {STAT_CATEGORIES.length} categories</p>
        </Card>
      </div>

      {/* Per-category breakdown with expandable test history */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Marks by category</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Click a card to see every dated test mark. Click the category name for site-wide
              stats.
            </p>
          </div>
          <DistributionLegend />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STAT_CATEGORIES.map((category, i) => {
            const score = referee.scores[category.slug] ?? 0;
            const history = getTestHistory(referee.id, category.slug);
            const distribution = getRefereeDistribution(referee.id, category.slug);
            const isOpen = openCategory === category.slug;

            return (
              <Card
                key={category.slug}
                padded={false}
                hoverable
                className={`h-fit animate-slide-up ${isOpen ? "border-cyan-500/40 shadow-glow" : ""}`}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                onClick={() => setOpenCategory(isOpen ? null : category.slug)}
              >
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-cyan-500">
                        {category.short}
                      </p>
                      <Link
                        href={`/stats/category/${category.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-lg font-semibold text-text-primary transition-colors hover:text-accent"
                      >
                        {category.name} ↗
                      </Link>
                    </div>
                    <ScoreBadge score={score} />
                  </div>

                  <DistributionBar distribution={distribution} size="sm" />

                  <div className="flex items-end justify-between gap-3">
                    <p className="text-xs text-text-muted">
                      {getTestsTaken(referee.id, category.slug)} tests
                    </p>
                    <div className="w-24 flex-shrink-0">
                      <Sparkline values={history.map((h) => h.score)} height={24} />
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isOpen ? "Hide test history" : "Show test history"}
                  </p>
                </div>

                {/* Dated test history (deck slide 58: Date / Mark) */}
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-dark-600 bg-dark-900/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-text-muted">
                            <th className="px-5 py-2 font-medium">Date</th>
                            <th className="px-5 py-2 text-right font-medium">Mark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...history].reverse().map((entry, j) => (
                            <tr
                              key={j}
                              className="border-t border-dark-600/50 transition-colors hover:bg-dark-700/50"
                            >
                              <td className="px-5 py-2 text-text-secondary">
                                {formatHistoryDate(entry.date)}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-bold tabular-nums ${scoreTextColor(entry.score)}`}
                              >
                                {entry.score}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
