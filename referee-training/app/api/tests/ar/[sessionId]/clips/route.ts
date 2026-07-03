import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  const arSession = await prisma.arTestSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      clipIds: true,
      totalClips: true,
      completedAt: true,
    },
  });

  if (!arSession || arSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Intentionally excludes correctAnswer / passFrameUrl so answers can't be
  // read from the network tab during the test.
  const clips = await prisma.arClip.findMany({
    where: { id: { in: arSession.clipIds }, isActive: true },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      thumbnailUrl: true,
      duration: true,
    },
  });

  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const orderedClips = arSession.clipIds
    .map((id) => clipMap.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return NextResponse.json({
    clips: orderedClips.map((c) => ({
      id: c.id,
      title: c.title,
      fileUrl: c.fileUrl,
      thumbnailUrl: c.thumbnailUrl ?? undefined,
      duration: c.duration ?? undefined,
    })),
    totalClips: arSession.totalClips,
    isCompleted: Boolean(arSession.completedAt),
  });
}
