import { REFEREE_LEVELS, type Conference, type StatReferee } from "@/lib/stats-mock";
import type { StatsFiltersState } from "@/lib/stats-filters-context";
import type { FilterableAssociation } from "@/components/stats/StatsFilterBar";

export type StatsFilterContext = {
  isSuperAdmin: boolean;
  hasDualScope: boolean;
  associations: FilterableAssociation[];
  federationCountryCode: string | null;
  conferenceName: Conference | null;
};

/**
 * Applies only the association/conference portion of the filters (i.e. scope),
 * ignoring the rank selection. Used both as the first stage of
 * {@link applyStatsFilters} and to derive which ranks are available for the
 * current scope.
 */
export function applyScopeFilters(
  referees: StatReferee[],
  filters: StatsFiltersState,
  ctx: StatsFilterContext
): StatReferee[] {
  let list = referees;

  if (ctx.isSuperAdmin) {
    if (filters.associationId) {
      const assoc = ctx.associations.find((a) => a.id === filters.associationId);
      if (assoc) {
        list = assoc.isInternational
          ? list.filter((r) => r.conference === assoc.name)
          : list.filter((r) => r.associationCountryCode === assoc.countryCode);
      }
    }
  } else if (ctx.hasDualScope) {
    if (filters.scope === "federation") {
      list = list.filter((r) => r.associationCountryCode === ctx.federationCountryCode);
    } else if (filters.scope === "conference") {
      list = list.filter((r) => r.conference === ctx.conferenceName);
    }
  }

  return list;
}

/**
 * Applies the persisted cross-page stats filters (association/scope/rank) to
 * a base, role-scoped referee list. Shared by every stats view so the same
 * filter selection behaves identically everywhere.
 */
export function applyStatsFilters(
  referees: StatReferee[],
  filters: StatsFiltersState,
  ctx: StatsFilterContext
): StatReferee[] {
  let list = applyScopeFilters(referees, filters, ctx);

  if (filters.rank) {
    list = list.filter((r) => r.level === filters.rank);
  }

  return list;
}

/**
 * The distinct referee ranks (Elite, Category 1, ...) present in the current
 * scope, in canonical order. The rank filter should only offer these so it
 * always reflects the selected federation/conference.
 */
export function getAvailableRanks(
  referees: StatReferee[],
  filters: StatsFiltersState,
  ctx: StatsFilterContext
): string[] {
  const inScope = applyScopeFilters(referees, { ...filters, rank: null }, ctx);
  const present = new Set(inScope.map((r) => r.level));
  return REFEREE_LEVELS.filter((level) => present.has(level));
}
