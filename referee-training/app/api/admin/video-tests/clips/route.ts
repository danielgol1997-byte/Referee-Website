import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/roles";
import { contentWhere } from "@/lib/scope";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const scope = isSuperAdmin(auth.user.role) ? {} : contentWhere(auth.user.associationId);

  const clips = await prisma.videoClip.findMany({
    where: { isActive: true, ...scope },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ clips });
}
