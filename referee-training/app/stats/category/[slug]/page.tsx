import { notFound, redirect } from "next/navigation";
import { STAT_CATEGORIES } from "@/lib/stats-mock";
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

  return <CategoryStatsView slug={slug} />;
}
