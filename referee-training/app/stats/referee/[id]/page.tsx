import { notFound } from "next/navigation";
import { STAT_REFEREES } from "@/lib/stats-mock";
import { RefereeStatsView } from "@/components/stats/RefereeStatsView";

export function generateStaticParams() {
  return STAT_REFEREES.map((r) => ({ id: r.id }));
}

export default async function RefereeStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const referee = STAT_REFEREES.find((r) => r.id === id);
  if (!referee) notFound();

  return <RefereeStatsView refereeId={id} />;
}
