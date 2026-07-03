import { notFound } from "next/navigation";
import { STAT_CATEGORIES } from "@/lib/stats-mock";
import { CategoryStatsView } from "@/components/stats/CategoryStatsView";

export function generateStaticParams() {
  return STAT_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = STAT_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  return <CategoryStatsView slug={slug} />;
}
