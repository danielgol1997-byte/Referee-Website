"use client";

import Link from "next/link";
import { STAT_CATEGORIES } from "@/lib/stats-mock";

/**
 * Simple pill-tab bar of every category, scoped to one referee.
 * All options are visible at once; the active one is highlighted. Clicking a
 * pill stays on the same referee (`/stats/referee/[id]/category/[slug]`).
 */
export function CategoryTabs({
  refereeId,
  currentSlug,
}: {
  refereeId: string;
  currentSlug: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAT_CATEGORIES.map((c) => {
        const active = c.slug === currentSlug;
        return (
          <Link
            key={c.slug}
            href={`/stats/referee/${refereeId}/category/${c.slug}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              active
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 font-semibold text-dark-900 shadow-sm"
                : "border border-dark-600 bg-dark-800/60 text-text-secondary hover:border-accent/40 hover:text-text-primary"
            }`}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}
