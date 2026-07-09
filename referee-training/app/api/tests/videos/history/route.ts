import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.videoTestSession.findMany({
    where: { userId: session.user.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      score: true,
      totalClips: true,
      completedAt: true,
      videoTest: { select: { name: true } },
    },
  });

  const history = sessions.map((s) => ({
    id: s.id,
    score: s.score,
    totalClips: s.totalClips,
    completedAt: s.completedAt,
    testName: s.videoTest?.name ?? null,
  }));

  return NextResponse.json({ history });
}
