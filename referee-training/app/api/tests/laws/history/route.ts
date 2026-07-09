import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.testSession.findMany({
    where: { userId: session.user.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      score: true,
      totalQuestions: true,
      completedAt: true,
      mandatoryTest: { select: { title: true } },
      category: { select: { name: true } },
    },
  });

  const history = sessions.map((s) => ({
    id: s.id,
    score: s.score,
    totalQuestions: s.totalQuestions,
    completedAt: s.completedAt,
    testName: s.mandatoryTest?.title ?? s.category?.name ?? null,
  }));

  return NextResponse.json({ history });
}
