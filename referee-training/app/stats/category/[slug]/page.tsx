import { notFound, redirect } from "next/navigation";
import { STAT_CATEGORIES, getScopedReferees } from "@/lib/stats-mock";
import { getStatsAccess } from "@/lib/stats-access";
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

  // FA admins only rank referees inside their own federation.
  const referees = getScopedReferees({
    isSuperAdmin: access.isSuperAdminView,
    isAdmin: access.isAdminView,
    associationCountryCode: access.associationCountryCode,
    myRefereeId: access.myRefereeId,
  });

  return <CategoryStatsView slug={slug} referees={referees} />;
}
