import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/roles";

/**
 * GET /api/admin/ranks?associationId=... | ?international=true
 * Lists ranks for an association, or every category belonging to an
 * international federation (?international=true).
 * FA admins may read their own association's ranks and international
 * categories; super admins may read any.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(request.url);
  const international = searchParams.get("international") === "true";
  let associationId = searchParams.get("associationId");

  // FA admins can only read ranks for their own association.
  if (!isSuperAdmin(guard.user.role) && !international) {
    associationId = guard.user.associationId;
    if (!associationId) return NextResponse.json({ ranks: [] });
  }

  const where = international
    ? { association: { isInternational: true } }
    : associationId
      ? { associationId }
      : {};

  const ranks = await prisma.rank.findMany({
    where,
    orderBy: [{ associationId: "asc" }, { order: "asc" }],
    include: {
      _count: { select: { members: true, internationalMembers: true } },
      ...(international
        ? { association: { select: { id: true, name: true, isInternational: true } } }
        : {}),
    },
  });

  return NextResponse.json({ ranks });
}

/**
 * POST /api/admin/ranks
 * Create a rank/category inside an association or international federation.
 * Super admin only.
 */
export async function POST(request: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const associationId =
    typeof body?.associationId === "string" && body.associationId.trim()
      ? body.associationId.trim()
      : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!associationId) {
    return NextResponse.json({ error: "Association is required." }, { status: 400 });
  }

  const association = await prisma.association.findUnique({ where: { id: associationId } });
  if (!association) {
    return NextResponse.json({ error: "Association not found." }, { status: 404 });
  }

  const last = await prisma.rank.findFirst({
    where: { associationId },
    orderBy: { order: "desc" },
  });
  const order = last ? last.order + 1 : 0;

  const rank = await prisma.rank.create({
    data: { name, associationId, order },
    include: { _count: { select: { members: true, internationalMembers: true } } },
  });

  return NextResponse.json({ rank }, { status: 201 });
}
