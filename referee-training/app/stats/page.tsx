import Link from "next/link";
import { redirect } from "next/navigation";
import { getStatsAccess } from "@/lib/stats-access";
import { getScopedReferees } from "@/lib/stats-mock";
import { prisma } from "@/lib/prisma";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { MarksByReferee } from "@/components/stats/MarksByReferee";
import { MarksByCategory } from "@/components/stats/MarksByCategory";
import { StatsFederationFilter } from "@/components/stats/StatsFederationFilter";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "referees", label: "Referees" },
  { id: "categories", label: "Categories" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; fa?: string }>;
}) {
  const access = await getStatsAccess();
  if (!access) redirect("/auth/login?callbackUrl=/stats");

  // Referees only see their own stats.
  if (!access.isAdminView) {
    redirect(`/stats/referee/${access.myRefereeId}`);
  }

  const params = await searchParams;
  const activeTab: TabId = TABS.some((t) => t.id === params.tab)
    ? (params.tab as TabId)
    : "overview";

  // Super admins can narrow to one federation; FA admins are locked to theirs.
  const associations = access.isSuperAdminView
    ? await prisma.association.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, countryCode: true },
      })
    : [];
  const selectedFa = access.isSuperAdminView
    ? associations.find((a) => a.id === params.fa) ?? null
    : null;

  const referees = getScopedReferees({
    isSuperAdmin: access.isSuperAdminView,
    isAdmin: access.isAdminView,
    associationCountryCode: access.associationCountryCode,
    myRefereeId: access.myRefereeId,
    filterCountryCode: selectedFa?.countryCode ?? null,
  });

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
          <h1 className="text-3xl font-bold text-premium">Statistics</h1>
          <p className="mt-2 text-text-secondary">Referees, categories, and tests at a glance</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Mock preview — placeholder data
          </span>
          {access.isSuperAdminView ? (
            <StatsFederationFilter
              associations={associations}
              value={selectedFa?.id ?? "all"}
              activeTab={activeTab}
            />
          ) : (
            access.associationName && (
              <span className="text-xs text-text-muted">Federation: {access.associationName}</span>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const faQuery = selectedFa ? `&fa=${selectedFa.id}` : "";
          const href =
            tab.id === "overview"
              ? selectedFa
                ? `/stats?tab=overview${faQuery}`
                : "/stats"
              : `/stats?tab=${tab.id}${faQuery}`;
          return (
          <Link
            key={tab.id}
            href={href}
            scroll={false}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider text-center transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
                : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
            }`}
          >
            {tab.label}
          </Link>
          );
        })}
      </div>

      <div
        key={activeTab}
        className="min-h-[500px] animate-in fade-in slide-in-from-top-4 duration-300"
      >
        {activeTab === "overview" && <StatsOverview referees={referees} />}
        {activeTab === "referees" && <MarksByReferee referees={referees} />}
        {activeTab === "categories" && <MarksByCategory referees={referees} />}
      </div>
    </div>
  );
}
