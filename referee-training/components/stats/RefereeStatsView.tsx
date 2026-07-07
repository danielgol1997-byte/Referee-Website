"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  STAT_CATEGORIES,
  STAT_REFEREES,
  formatHistoryDate,
  formatScore,
  getRefereeDistribution,
  getTestHistory,
  getTestsTaken,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { DistributionBar, DistributionLegend } from "./DistributionBar";
import { Sparkline } from "./Sparkline";
import { ScoreBadge } from "./ScoreBadge";
import { ProfileCard } from "./ProfileCard";
import { ReportsInsights } from "./ReportsInsights";
import { scoreTextColor } from "./score-utils";

export function RefereeStatsView({
  refereeId,
  isOwnView = false,
}: {
  refereeId: string;
  isOwnView?: boolean;
}) {
  const index = STAT_REFEREES.findIndex((r) => r.id === refereeId);
  const referee = STAT_REFEREES[index];
  const previous = STAT_REFEREES[(index - 1 + STAT_REFEREES.length) % STAT_REFEREES.length];
  const next = STAT_REFEREES[(index + 1) % STAT_REFEREES.length];

  const [openCategory, setOpenCategory] = useState<string | null>(null);

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
          {isOwnView ? (
            <span className="font-medium text-text-primary">My Stats</span>
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
              <span className="font-medium text-text-primary">{referee.name}</span>
            </>
          )}
        </nav>
        {!isOwnView && (
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
        )}
      </div>

      {/* Profile */}
      <ProfileCard referee={referee} isOwnView={isOwnView} />

      {/* AI analysis + the observer reports it's based on (shared season) */}
      <ReportsInsights refereeId={refereeId} />

      {/* Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <HighlightCard
          label="Strongest category"
          name={strongest.name}
          mark={referee.scores[strongest.slug] ?? 0}
          tone="strong"
          href={`/stats/referee/${refereeId}/category/${strongest.slug}`}
        />
        <HighlightCard
          label="Focus area"
          name={weakest.name}
          mark={referee.scores[weakest.slug] ?? 0}
          tone="focus"
          href={`/stats/referee/${refereeId}/category/${weakest.slug}`}
        />
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
                        href={`/stats/referee/${refereeId}/category/${category.slug}`}
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

function HighlightCard({
  label,
  name,
  mark,
  tone,
  href,
}: {
  label: string;
  name: string;
  mark: number;
  tone: "strong" | "focus";
  href?: string;
}) {
  const toneColor = tone === "strong" ? "text-[#4ade80]" : "text-[#f87171]";
  const inner = (
    <Card hoverable={!!href} className="h-full space-y-1">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`text-xl font-bold transition-colors ${toneColor} ${href ? "group-hover:text-accent" : ""}`}>
        {name}
        {href ? " →" : ""}
      </p>
      <p className="text-xs text-text-muted">ave. mark {formatScore(mark)}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="group">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}
