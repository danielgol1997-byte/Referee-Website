"use client";

import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { REFEREE_LEVELS } from "@/lib/stats-mock";
import { useStatsFilters } from "@/lib/stats-filters-context";
import { flagEmoji } from "@/lib/countries";

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
  hasDualScope,
  federationLabel,
  conferenceLabel,
}: {
  isSuperAdmin: boolean;
  associations?: FilterableAssociation[];
  hasDualScope?: boolean;
  federationLabel?: string | null;
  conferenceLabel?: string | null;
}) {
  const { filters, setAssociationId, setScope, setRank, clearAll, hasActiveFilters } =
    useStatsFilters();

  const associationOptions = [
    { value: "all", label: "All federations & confederations" },
    ...associations.map((a) => ({
      value: a.id,
      label: a.isInternational
        ? `🌍 ${a.name}`
        : `${flagEmoji(a.countryCode) || "🏳️"} ${a.name}`,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-dark-600 bg-gradient-to-br from-dark-800/80 to-dark-800/40 px-4 py-3 shadow-sm backdrop-blur-sm">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h18M6 8h12M9 12h6M11 16h2"
          />
        </svg>
        Filters
      </span>

      {isSuperAdmin && (
        <Select
          value={filters.associationId ?? "all"}
          onChange={(v) => setAssociationId(v === "all" ? null : String(v))}
          options={associationOptions}
          className="w-56"
        />
      )}

      {hasDualScope && (
        <SegmentedControl
          value={filters.scope}
          onChange={(v) => setScope(v as typeof filters.scope)}
          options={[
            { value: "federation", label: federationLabel ?? "Federation" },
            { value: "conference", label: conferenceLabel ?? "Conference" },
            { value: "both", label: "Both" },
          ]}
        />
      )}

      <Select
        value={filters.rank ?? "all"}
        onChange={(v) => setRank(v === "all" ? null : String(v))}
        options={[
          { value: "all", label: "All ranks" },
          ...REFEREE_LEVELS.map((l) => ({ value: l, label: l })),
        ]}
        className="w-40"
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filters
        </button>
      )}
    </div>
  );
}
