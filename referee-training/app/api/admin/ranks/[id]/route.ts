import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/**
 * PATCH /api/admin/ranks/[id]
 * Rename or reorder a rank. `direction` ("up"|"down") swaps order with the
 * neighbouring rank in the same group. Super admin only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const rank = await prisma.rank.findUnique({ where: { id } });
  if (!rank) return NextResponse.json({ error: "Rank not found." }, { status: 404 });

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    await prisma.rank.update({ where: { id }, data: { name } });
  }

  if (body?.direction === "up" || body?.direction === "down") {
    const neighbour = await prisma.rank.findFirst({
      where: {
        associationId: rank.associationId,
        order: body.direction === "up" ? { lt: rank.order } : { gt: rank.order },
      },
      orderBy: { order: body.direction === "up" ? "desc" : "asc" },
    });
    if (neighbour) {
      await prisma.$transaction([
        prisma.rank.update({ where: { id: rank.id }, data: { order: neighbour.order } }),
        prisma.rank.update({ where: { id: neighbour.id }, data: { order: rank.order } }),
      ]);
    }
  }

  const updated = await prisma.rank.findUnique({
    where: { id },
    include: { _count: { select: { members: true, internationalMembers: true } } },
  });

  return NextResponse.json({ rank: updated });
}

/**
 * DELETE /api/admin/ranks/[id]
 * Delete a rank. Referees holding it have their rank cleared (set null).
 * Super admin only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;

  await prisma.user.updateMany({ where: { rankId: id }, data: { rankId: null } });
  await prisma.user.updateMany({ where: { internationalRankId: id }, data: { internationalRankId: null } });
  await prisma.rank.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
