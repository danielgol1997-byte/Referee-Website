import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { CURRENT_USER_REFEREE_ID } from "@/lib/stats-mock";

export type StatsAccess = {
  userId: string;
  role: string;
  /** Admins / super-admins / developers see everyone's stats. */
  isAdminView: boolean;
  /** The referee record a REFEREE-role user is allowed to view ("me"). */
  myRefereeId: string;
};

/**
 * Resolves the current user's stats access.
 * Returns null when unauthenticated (caller should redirect to login).
 */
export async function getStatsAccess(): Promise<StatsAccess | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = session.user.role as string;
  return {
    userId: session.user.id,
    role,
    isAdminView: isAdmin(role),
    // Users aren't in the mock dataset yet; a REFEREE maps to a fixed mock referee.
    myRefereeId: CURRENT_USER_REFEREE_ID,
  };
}
