import { notFound, redirect } from "next/navigation";
import { STAT_REFEREES } from "@/lib/stats-mock";
import { getStatsAccess } from "@/lib/stats-access";
import { RefereeStatsView } from "@/components/stats/RefereeStatsView";

export default async function RefereeStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const access = await getStatsAccess();
  if (!access) redirect(`/auth/login?callbackUrl=/stats/referee/${id}`);

  // Referees may only view their own record.
  if (!access.isAdminView && id !== access.myRefereeId) {
    redirect(`/stats/referee/${access.myRefereeId}`);
  }

  const referee = STAT_REFEREES.find((r) => r.id === id);
  if (!referee) notFound();

  return <RefereeStatsView refereeId={id} isOwnView={!access.isAdminView} />;
}
