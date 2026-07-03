import Link from "next/link";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { MarksByReferee } from "@/components/stats/MarksByReferee";
import { MarksByCategory } from "@/components/stats/MarksByCategory";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "referees", label: "By Referee" },
  { id: "categories", label: "By Category" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "overview";

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
          <h1 className="text-3xl font-bold text-premium">Statistics</h1>
          <p className="mt-2 text-text-secondary">
            Performance across referees, categories, and tests
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Mock preview — placeholder data
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.id === "overview" ? "/stats" : `/stats?tab=${tab.id}`}
            scroll={false}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider text-center transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
                : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div key={activeTab} className="min-h-[500px] animate-in fade-in slide-in-from-top-4 duration-300">
        {activeTab === "overview" && <StatsOverview />}
        {activeTab === "referees" && <MarksByReferee />}
        {activeTab === "categories" && <MarksByCategory />}
      </div>
    </div>
  );
}
