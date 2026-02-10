import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clips = await prisma.videoClip.findMany({
    where: { isActive: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ clips });
}
