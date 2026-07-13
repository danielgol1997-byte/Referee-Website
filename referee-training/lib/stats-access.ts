import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { CONFERENCES, CURRENT_USER_REFEREE_ID, type Conference } from "@/lib/stats-mock";

export type StatsAccess = {
  userId: string;
  role: string;
  /** Admins / super-admins / developers see aggregated stats (not just "me"). */
  isAdminView: boolean;
  /** Super admins / developers see every federation. */
  isSuperAdminView: boolean;
  /** The referee record a REFEREE-role user is allowed to view ("me"). */
  myRefereeId: string;
  /** The caller's national federation, used to scope FA-admin stats. */
  associationId: string | null;
  associationName: string | null;
  associationCountryCode: string | null;
  /** The caller's international confederation (UEFA/FIFA), if they're also a conference admin. */
  conferenceId: string | null;
  conferenceName: Conference | null;
  /** True when the admin is scoped to both a federation and a conference. */
  hasDualScope: boolean;
};

/**
 * Resolves the current user's stats access, including federation/confederation context.
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
      internationalAssociationId: true,
      internationalAssociation: { select: { name: true } },
    },
  });

  const conferenceName = (dbUser?.internationalAssociation?.name ?? null) as Conference | null;
  const validConference = conferenceName && (CONFERENCES as readonly string[]).includes(conferenceName)
    ? conferenceName
    : null;

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
    conferenceId: dbUser?.internationalAssociationId ?? null,
    conferenceName: validConference,
    hasDualScope: Boolean(dbUser?.associationId && validConference),
  };
}
