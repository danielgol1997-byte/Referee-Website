import { notFound, redirect } from "next/navigation";
import { STAT_CATEGORIES, getScopedReferees } from "@/lib/stats-mock";
import { getStatsAccess } from "@/lib/stats-access";
import { prisma } from "@/lib/prisma";
import { CategoryStatsView } from "@/components/stats/CategoryStatsView";

export default async function CategoryStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const access = await getStatsAccess();
  if (!access) redirect(`/auth/login?callbackUrl=/stats/category/${slug}`);

  // Category pages rank every referee, so they're admin-only.
  if (!access.isAdminView) {
    redirect(`/stats/referee/${access.myRefereeId}`);
  }

  const category = STAT_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const associations = access.isSuperAdminView
    ? await prisma.association.findMany({
        where: { isActive: true },
        orderBy: [{ isInternational: "asc" }, { name: "asc" }],
        select: { id: true, name: true, countryCode: true, isInternational: true },
      })
    : [];

  // FA admins rank referees inside their own federation/conference; the
  // persisted stats filters (association/scope/rank) narrow this further
  // client-side, same as the main stats page.
  const referees = getScopedReferees({
    isSuperAdmin: access.isSuperAdminView,
    isAdmin: access.isAdminView,
    associationCountryCode: access.associationCountryCode,
    conference: access.conferenceName,
    myRefereeId: access.myRefereeId,
    scope: "both",
  });

  return (
    <CategoryStatsView
      slug={slug}
      referees={referees}
      isSuperAdmin={access.isSuperAdminView}
      hasDualScope={access.hasDualScope}
      associations={associations}
      federationCountryCode={access.associationCountryCode}
      conferenceName={access.conferenceName}
    />
  );
}
