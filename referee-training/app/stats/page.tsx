import { redirect } from "next/navigation";
import { getStatsAccess } from "@/lib/stats-access";
import { getScopedReferees } from "@/lib/stats-mock";
import { prisma } from "@/lib/prisma";
import { StatsShell, type TabId } from "@/components/stats/StatsShell";

const VALID_TABS: TabId[] = ["overview", "referees", "categories"];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const access = await getStatsAccess();
  if (!access) redirect("/auth/login?callbackUrl=/stats");

  // Referees only see their own stats.
  if (!access.isAdminView) {
    redirect(`/stats/referee/${access.myRefereeId}`);
  }

  const params = await searchParams;
  const initialTab: TabId = VALID_TABS.includes(params.tab as TabId)
    ? (params.tab as TabId)
    : "overview";

  // Fetched once — all tab switching and filtering below happens client-side
  // against this in-memory data, so there's no server round trip per click.
  const associations = access.isSuperAdminView
    ? await prisma.association.findMany({
        where: { isActive: true },
        orderBy: [{ isInternational: "asc" }, { name: "asc" }],
        select: { id: true, name: true, countryCode: true, isInternational: true },
      })
    : [];

  // Dual-scoped (federation + conference) admins get the union server-side;
  // the client narrows to federation/conference/both via the filter bar.
  const referees = getScopedReferees({
    isSuperAdmin: access.isSuperAdminView,
    isAdmin: access.isAdminView,
    associationCountryCode: access.associationCountryCode,
    conference: access.conferenceName,
    myRefereeId: access.myRefereeId,
    scope: "both",
  });

  return (
    <StatsShell
      referees={referees}
      initialTab={initialTab}
      isSuperAdmin={access.isSuperAdminView}
      hasDualScope={access.hasDualScope}
      associations={associations}
      federationCountryCode={access.associationCountryCode}
      federationLabel={access.associationName}
      conferenceName={access.conferenceName}
      exportRole={access.isSuperAdminView ? "SUPER_ADMIN" : "ADMIN"}
    />
  );
}
