"use client";

/**
 * Cross-page stats filters (association scope, federation/conference toggle,
 * rank). Persisted to sessionStorage so a filter chosen on one stats page
 * (e.g. Referees) stays active when navigating into a referee or category
 * page and back, until explicitly cleared.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminScope } from "@/lib/stats-mock";

const STORAGE_KEY = "stats-filters-v1";

export type StatsFiltersState = {
  /** Super-admin-only: narrow to one association (federation or conference) id, or "all". */
  associationId: string | null;
  /** Dual-scoped admin only: which slice of their access to show. */
  scope: AdminScope;
  /** Narrow to one referee rank/level (Elite, Category 1, ...), or null for all. */
  rank: string | null;
};

const DEFAULT_STATE: StatsFiltersState = {
  associationId: null,
  scope: "both",
  rank: null,
};

type StatsFiltersContextValue = {
  filters: StatsFiltersState;
  setAssociationId: (id: string | null) => void;
  setScope: (scope: AdminScope) => void;
  setRank: (rank: string | null) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
};

const StatsFiltersContext = createContext<StatsFiltersContextValue | null>(null);

export function StatsFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<StatsFiltersState>(DEFAULT_STATE);

  useEffect(() => {
    // Hydrating from sessionStorage after mount (rather than in a lazy
    // useState initializer) keeps server and first-client render identical,
    // avoiding a hydration mismatch on the filter controls below.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from an external store (sessionStorage) on mount.
      if (raw) setFilters({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      // Ignore malformed/inaccessible storage — fall back to defaults.
    }
  }, []);

  const persist = useCallback((next: StatsFiltersState) => {
    setFilters(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode, quota) — filters just
      // won't survive a full navigation in that case.
    }
  }, []);

  const setAssociationId = useCallback(
    (id: string | null) => persist({ ...filters, associationId: id }),
    [filters, persist]
  );
  const setScope = useCallback(
    (scope: AdminScope) => persist({ ...filters, scope }),
    [filters, persist]
  );
  const setRank = useCallback(
    (rank: string | null) => persist({ ...filters, rank }),
    [filters, persist]
  );
  const clearAll = useCallback(() => persist(DEFAULT_STATE), [persist]);

  const hasActiveFilters =
    filters.associationId !== null || filters.scope !== "both" || filters.rank !== null;

  const value = useMemo(
    () => ({ filters, setAssociationId, setScope, setRank, clearAll, hasActiveFilters }),
    [filters, setAssociationId, setScope, setRank, clearAll, hasActiveFilters]
  );

  return <StatsFiltersContext.Provider value={value}>{children}</StatsFiltersContext.Provider>;
}

export function useStatsFilters(): StatsFiltersContextValue {
  const ctx = useContext(StatsFiltersContext);
  if (!ctx) throw new Error("useStatsFilters must be used within a StatsFiltersProvider");
  return ctx;
}
