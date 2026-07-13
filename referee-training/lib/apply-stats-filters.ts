import type { Conference, StatReferee } from "@/lib/stats-mock";
import type { StatsFiltersState } from "@/lib/stats-filters-context";
import type { FilterableAssociation } from "@/components/stats/StatsFilterBar";

/**
 * Applies the persisted cross-page stats filters (association/scope/rank) to
 * a base, role-scoped referee list. Shared by every stats view so the same
 * filter selection behaves identically everywhere.
 */
export function applyStatsFilters(
  referees: StatReferee[],
  filters: StatsFiltersState,
  ctx: {
    isSuperAdmin: boolean;
    hasDualScope: boolean;
    associations: FilterableAssociation[];
    federationCountryCode: string | null;
    conferenceName: Conference | null;
  }
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

  if (filters.rank) {
    list = list.filter((r) => r.level === filters.rank);
  }

  return list;
}
