import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/roles";

/**
 * GET /api/admin/referees?search=&associationId=&unassigned=true
 * Lists referees the caller may manage.
 *  - FA admins: only their own association.
 *  - Super admins: all; may filter by associationId or list unassigned refs.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const superAdmin = isSuperAdmin(guard.user.role);

  const where: Record<string, unknown> = {};

  if (superAdmin) {
    const associationId = searchParams.get("associationId");
    const unassigned = searchParams.get("unassigned") === "true";
    if (unassigned) where.associationId = null;
    else if (associationId) where.associationId = associationId;
  } else {
    // FA admins are locked to their own association.
    if (!guard.user.associationId) return NextResponse.json({ referees: [] });
    where.associationId = guard.user.associationId;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const referees = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      role: true,
      isActive: true,
      associationId: true,
      association: { select: { id: true, name: true, countryCode: true } },
      rank: { select: { id: true, name: true } },
      internationalAssociationId: true,
      internationalAssociation: { select: { id: true, name: true, countryCode: true } },
      internationalRank: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ referees });
}
