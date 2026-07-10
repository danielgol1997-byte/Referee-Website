import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/associations
 * Lists active national associations for onboarding (any signed-in user).
 * International federations are excluded: those are assigned by admins.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const associations = await prisma.association.findMany({
    where: { isActive: true, isInternational: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, countryCode: true },
  });

  return NextResponse.json({ associations });
}
