import { notFound, redirect } from "next/navigation";
import { STAT_CATEGORIES, STAT_REFEREES } from "@/lib/stats-mock";
import { getStatsAccess } from "@/lib/stats-access";
import { RefereeCategoryView } from "@/components/stats/RefereeCategoryView";

export default async function RefereeCategoryPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;

  const access = await getStatsAccess();
  if (!access) redirect(`/auth/login?callbackUrl=/stats/referee/${id}/category/${slug}`);

  // Referees may only view their own scoped pages.
  if (!access.isAdminView && id !== access.myRefereeId) {
    redirect(`/stats/referee/${access.myRefereeId}/category/${slug}`);
  }

  const referee = STAT_REFEREES.find((r) => r.id === id);
  const category = STAT_CATEGORIES.find((c) => c.slug === slug);
  if (!referee || !category) notFound();

  // FA admins may only view referees inside their own federation.
  if (
    access.isAdminView &&
    !access.isSuperAdminView &&
    referee.associationCountryCode !== access.associationCountryCode
  ) {
    redirect("/stats");
  }

  return <RefereeCategoryView refereeId={id} slug={slug} isOwnView={!access.isAdminView} />;
}
