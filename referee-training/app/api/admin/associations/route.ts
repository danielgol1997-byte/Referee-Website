import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireDeveloper } from "@/lib/api-auth";

/**
 * GET /api/admin/associations
 *  - default: all associations with rank + member counts. Any admin (the
 *    Users tab needs the full list for its dropdowns).
 *  - ?international=true: international federations (FIFA, UEFA, ...) with
 *    their categories, readable by any admin (needed to assign referees).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const internationalOnly = searchParams.get("international") === "true";

  if (internationalOnly) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const associations = await prisma.association.findMany({
      where: { isInternational: true, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        countryCode: true,
        isInternational: true,
        ranks: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, order: true },
        },
      },
    });
    return NextResponse.json({ associations });
  }

  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const associations = await prisma.association.findMany({
    orderBy: [{ isInternational: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { members: true, internationalMembers: true, ranks: true } },
    },
  });

  return NextResponse.json({ associations });
}

/**
 * POST /api/admin/associations
 * Create a new association or international federation. Developer only:
 * the hierarchy is built by developers, admins assign referees within it.
 */
export async function POST(request: Request) {
  const guard = await requireDeveloper();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const countryCode =
    typeof body?.countryCode === "string" && body.countryCode.trim()
      ? body.countryCode.trim().toUpperCase()
      : null;
  const isInternational = body?.isInternational === true;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = await prisma.association.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "An association with that name already exists." }, { status: 400 });
  }

  const association = await prisma.association.create({
    data: { name, countryCode, isInternational },
    include: { _count: { select: { members: true, internationalMembers: true, ranks: true } } },
  });

  return NextResponse.json({ association }, { status: 201 });
}
