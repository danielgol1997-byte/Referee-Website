"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  COUNTRY_FLAGS,
  STAT_CATEGORIES,
  formatScore,
  getCategoryAverage,
  getCategoryLeaderboard,
} from "@/lib/stats-mock";
import { scoreTextColor } from "./score-utils";

const COLLAPSED_COUNT = 5;

export function MarksByCategory() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Marks by category</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Top performers per category. Click a name for the referee&apos;s record, or the category
          for the full ranking.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STAT_CATEGORIES.map((category, i) => {
          const leaderboard = getCategoryLeaderboard(category.slug);
          const isExpanded = expanded[category.slug];
          const shown = isExpanded ? leaderboard : leaderboard.slice(0, COLLAPSED_COUNT);
          const average = getCategoryAverage(category.slug);

          return (
            <Card
              key={category.slug}
              padded={false}
              className="flex h-fit flex-col animate-slide-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
            >
              <Link
                href={`/stats/category/${category.slug}`}
                className="group flex items-center justify-between border-b border-dark-600 bg-dark-700/50 px-5 py-4 transition-colors hover:bg-dark-700"
              >
                <div>
                  <h3 className="font-semibold text-text-primary transition-colors group-hover:text-accent">
                    {category.name}
                  </h3>
                  <p className="text-xs text-text-muted">
                    ave. mark{" "}
                    <span className={scoreTextColor(average)}>{formatScore(average)}</span>
                  </p>
                </div>
                <span className="text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent">
                  →
                </span>
              </Link>

              <ol className="flex-1 divide-y divide-dark-600/60">
                {shown.map((referee, rank) => (
                  <li key={referee.id}>
                    <Link
                      href={`/stats/referee/${referee.id}`}
                      className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-dark-700/60"
                    >
                      <span
                        className={`w-5 flex-shrink-0 text-center text-xs font-bold tabular-nums ${
                          rank === 0 ? "text-accent" : "text-text-muted"
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-text-primary transition-colors group-hover:text-accent">
                        {referee.name}
                        <span className="ml-1.5 text-xs text-text-muted">
                          {COUNTRY_FLAGS[referee.country]}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-bold tabular-nums ${scoreTextColor(referee.scores[category.slug] ?? 0)}`}
                      >
                        {(referee.scores[category.slug] ?? 0).toFixed(2)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <div className="border-t border-dark-600/60 p-2">
                <Button
                  variant="ghost"
                  size="xs"
                  className="w-full"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [category.slug]: !prev[category.slug] }))
                  }
                >
                  {isExpanded ? "Show top 5" : `Show all ${leaderboard.length}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
