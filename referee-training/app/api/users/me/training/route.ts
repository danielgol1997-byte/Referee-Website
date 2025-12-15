import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const categories = await prisma.category.findMany({
    include: {
      testSessions: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      trainingAssignments: {
        where: { userId },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const overview = categories.map((category) => {
    const lastSession = category.testSessions[0];
    const pending = category.trainingAssignments.filter((a) => a.status !== "COMPLETED").length;
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      type: category.type,
      lastScore: lastSession?.score ?? null,
      pendingAssignments: pending,
    };
  });

  const assignments = await prisma.trainingAssignment.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    overview,
    assignments,
  });
}

