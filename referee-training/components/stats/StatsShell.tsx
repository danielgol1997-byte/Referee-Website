"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatsOverview } from "./StatsOverview";
import { MarksByReferee } from "./MarksByReferee";
import { MarksByCategory } from "./MarksByCategory";
import { StatsFilterBar, type FilterableAssociation } from "./StatsFilterBar";
import { ExportButton } from "./ExportDialog";
import { useStatsFilters } from "@/lib/stats-filters-context";
import { applyStatsFilters } from "@/lib/apply-stats-filters";
import type { Conference, StatReferee } from "@/lib/stats-mock";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "referees", label: "Referees" },
  { id: "categories", label: "Categories" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/**
 * Client-side shell for the whole /stats page. Tab switching and filtering
 * happen entirely in memory (data is fetched once by the server), so there's
 * no network round trip on every click — this is what makes tabs feel
 * instant instead of the ~1.5s full-page re-render the old Link-based tabs
 * incurred.
 */
export function StatsShell({
  referees,
  initialTab,
  isSuperAdmin,
  hasDualScope,
  associations,
  federationCountryCode,
  federationLabel,
  conferenceName,
  exportRole,
}: {
  referees: StatReferee[];
  initialTab: TabId;
  isSuperAdmin: boolean;
  hasDualScope: boolean;
  associations: FilterableAssociation[];
  federationCountryCode: string | null;
  federationLabel: string | null;
  conferenceName: Conference | null;
  exportRole: "ADMIN" | "SUPER_ADMIN";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { filters } = useStatsFilters();

  const scopedReferees = useMemo(
    () =>
      applyStatsFilters(referees, filters, {
        isSuperAdmin,
        hasDualScope,
        associations,
        federationCountryCode,
        conferenceName,
      }),
    [referees, filters, isSuperAdmin, hasDualScope, associations, federationCountryCode, conferenceName]
  );

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    router.replace(id === "overview" ? "/stats" : `/stats?tab=${id}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="h-6 w-1 rounded-full bg-gradient-to-b from-warm to-cyan-500" />
        <h1 className="text-2xl font-bold text-premium">Statistics</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Mock preview
        </span>
        <div className="ml-auto">
          <ExportButton
            role={exportRole}
            referees={referees}
            scopeLabel={federationLabel}
            scope={{
              isSuperAdmin,
              hasDualScope,
              associations,
              federationCountryCode,
              federationLabel,
              conferenceName,
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <StatsFilterBar
        isSuperAdmin={isSuperAdmin}
        associations={associations}
        hasDualScope={hasDualScope}
        federationLabel={federationLabel}
        conferenceLabel={conferenceName}
        referees={referees}
        federationCountryCode={federationCountryCode}
        conferenceName={conferenceName}
      />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider text-center transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
                : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        key={activeTab}
        className="min-h-[500px] animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {activeTab === "overview" && <StatsOverview referees={scopedReferees} />}
        {activeTab === "referees" && <MarksByReferee referees={scopedReferees} />}
        {activeTab === "categories" && <MarksByCategory referees={scopedReferees} />}
      </div>
    </div>
  );
}
