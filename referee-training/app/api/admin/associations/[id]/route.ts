import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/**
 * PATCH /api/admin/associations/[id]
 * Rename, change country, or toggle active. Super admin only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: { name?: string; countryCode?: string | null; isActive?: boolean; isInternational?: boolean } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    const clash = await prisma.association.findFirst({ where: { name, id: { not: id } } });
    if (clash) return NextResponse.json({ error: "An association with that name already exists." }, { status: 400 });
    data.name = name;
  }
  if (body?.countryCode !== undefined) {
    data.countryCode =
      typeof body.countryCode === "string" && body.countryCode.trim()
        ? body.countryCode.trim().toUpperCase()
        : null;
  }
  if (typeof body?.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (typeof body?.isInternational === "boolean") {
    data.isInternational = body.isInternational;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const association = await prisma.association.update({
    where: { id },
    data,
    include: { _count: { select: { members: true, internationalMembers: true, ranks: true } } },
  });

  return NextResponse.json({ association });
}

/**
 * DELETE /api/admin/associations/[id]
 * Delete an association. Blocked while referees are still assigned to it.
 * Super admin only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;

  const memberCount = await prisma.user.count({
    where: { OR: [{ associationId: id }, { internationalAssociationId: id }] },
  });
  if (memberCount > 0) {
    return NextResponse.json(
      { error: `Move or remove the ${memberCount} referee(s) in this association first.` },
      { status: 400 }
    );
  }

  // Ranks cascade-delete with the association.
  await prisma.association.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
