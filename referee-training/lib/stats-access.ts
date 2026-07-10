import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { CURRENT_USER_REFEREE_ID } from "@/lib/stats-mock";

export type StatsAccess = {
  userId: string;
  role: string;
  /** Admins / super-admins / developers see aggregated stats (not just "me"). */
  isAdminView: boolean;
  /** Super admins / developers see every federation. */
  isSuperAdminView: boolean;
  /** The referee record a REFEREE-role user is allowed to view ("me"). */
  myRefereeId: string;
  /** The caller's federation, used to scope FA-admin stats. */
  associationId: string | null;
  associationName: string | null;
  associationCountryCode: string | null;
};

/**
 * Resolves the current user's stats access, including federation context.
 * Returns null when unauthenticated (caller should redirect to login).
 */
export async function getStatsAccess(): Promise<StatsAccess | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = session.user.role as string;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      associationId: true,
      association: { select: { name: true, countryCode: true } },
    },
  });

  return {
    userId: session.user.id,
    role,
    isAdminView: isAdmin(role),
    isSuperAdminView: isSuperAdmin(role),
    // Users aren't in the mock dataset yet; a REFEREE maps to a fixed mock referee.
    myRefereeId: CURRENT_USER_REFEREE_ID,
    associationId: dbUser?.associationId ?? null,
    associationName: dbUser?.association?.name ?? null,
    associationCountryCode: dbUser?.association?.countryCode ?? null,
  };
}
