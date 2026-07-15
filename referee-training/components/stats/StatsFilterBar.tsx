"use client";

import { useEffect, useMemo } from "react";
import { useStatsFilters } from "@/lib/stats-filters-context";
import { getAvailableRanks, type StatsFilterContext } from "@/lib/apply-stats-filters";
import type { StatReferee } from "@/lib/stats-mock";
import { ScopeControls } from "./ScopeControls";

export type FilterableAssociation = {
  id: string;
  name: string;
  countryCode: string | null;
  isInternational: boolean;
};

/**
 * Sleek, role-aware filter toolbar for the stats pages. Filters live in
 * `StatsFiltersProvider` (sessionStorage-backed), so whatever is chosen here
 * stays active across tabs and into referee/category pages until cleared.
 */
export function StatsFilterBar({
  isSuperAdmin,
  associations = [],
  hasDualScope = false,
  federationLabel,
  conferenceLabel,
  referees,
  federationCountryCode = null,
  conferenceName = null,
}: {
  isSuperAdmin: boolean;
  associations?: FilterableAssociation[];
  hasDualScope?: boolean;
  federationLabel?: string | null;
  conferenceLabel?: string | null;
  /** Role-scoped referee list (before filtering), used to derive rank options. */
  referees: StatReferee[];
  federationCountryCode?: string | null;
  conferenceName?: StatsFilterContext["conferenceName"];
}) {
  const { filters, setAssociationId, setScope, setRank, clearAll, hasActiveFilters } =
    useStatsFilters();

  const ctx: StatsFilterContext = useMemo(
    () => ({ isSuperAdmin, hasDualScope, associations, federationCountryCode, conferenceName }),
    [isSuperAdmin, hasDualScope, associations, federationCountryCode, conferenceName]
  );

  const availableRanks = useMemo(
    () => getAvailableRanks(referees, filters, ctx),
    [referees, filters, ctx]
  );

  // If the selected rank no longer exists in the current scope, drop it.
  useEffect(() => {
    if (filters.rank && !availableRanks.includes(filters.rank)) {
      setRank(null);
    }
  }, [filters.rank, availableRanks, setRank]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dark-600 bg-dark-800/60 px-3 py-2 backdrop-blur-sm">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h18M6 8h12M9 12h6M11 16h2"
          />
        </svg>
        Filters
      </span>

      <ScopeControls
        isSuperAdmin={isSuperAdmin}
        associations={associations}
        hasDualScope={hasDualScope}
        federationLabel={federationLabel}
        conferenceLabel={conferenceLabel}
        associationId={filters.associationId}
        scope={filters.scope}
        rank={filters.rank}
        availableRanks={availableRanks}
        onAssociationChange={setAssociationId}
        onScopeChange={setScope}
        onRankChange={setRank}
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
