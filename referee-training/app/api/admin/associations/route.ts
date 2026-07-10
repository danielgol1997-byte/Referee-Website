import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/**
 * GET /api/admin/associations
 * List all associations with rank + member counts. Super admin only.
 */
export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const associations = await prisma.association.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, ranks: true } },
    },
  });

  return NextResponse.json({ associations });
}

/**
 * POST /api/admin/associations
 * Create a new association. Super admin only.
 */
export async function POST(request: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const countryCode =
    typeof body?.countryCode === "string" && body.countryCode.trim()
      ? body.countryCode.trim().toUpperCase()
      : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = await prisma.association.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "An association with that name already exists." }, { status: 400 });
  }

  const association = await prisma.association.create({
    data: { name, countryCode },
    include: { _count: { select: { members: true, ranks: true } } },
  });

  return NextResponse.json({ association }, { status: 201 });
}
