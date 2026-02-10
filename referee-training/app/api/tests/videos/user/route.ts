import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoTestType } from "@prisma/client";
import { buildVideoClipWhereForUser } from "@/lib/video-test-filters";

function shuffleArray<T>(array: T[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, totalClips, passingScore, filters } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const totalClipsNum = Number.isFinite(totalClips) ? Math.floor(totalClips as number) : 0;
    if (totalClipsNum <= 0) {
      return NextResponse.json({ error: "totalClips must be a positive number" }, { status: 400 });
    }

    if (
      passingScore !== undefined &&
      passingScore !== null &&
      (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100)
    ) {
      return NextResponse.json({ error: "passingScore must be between 0 and 100" }, { status: 400 });
    }

    const categoryTags = filters?.categoryTags ?? [];
    if (!Array.isArray(categoryTags) || categoryTags.length === 0) {
      return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
    }

    const where = buildVideoClipWhereForUser({
      categoryTags,
    });

    const eligible = await prisma.videoClip.findMany({
      where,
      select: { id: true },
    });

    if (eligible.length === 0) {
      return NextResponse.json({ error: "No videos match the selected category" }, { status: 400 });
    }

    if (totalClipsNum > eligible.length) {
      return NextResponse.json({ error: "Not enough videos match the selected category" }, { status: 400 });
    }

    const selectedIds = shuffleArray(eligible.map((c) => c.id)).slice(0, totalClipsNum);

    const videoTest = await prisma.videoTest.create({
      data: {
        name: name.trim(),
        type: VideoTestType.USER,
        totalClips: totalClipsNum,
        passingScore: Number.isFinite(passingScore) ? Math.floor(passingScore as number) : null,
        isActive: true,
        createdById: session.user.id,
      },
    });

    await prisma.videoTestClip.createMany({
      data: selectedIds.map((videoClipId: string, order: number) => ({
        videoTestId: videoTest.id,
        videoClipId,
        order,
      })),
    });

    const created = await prisma.videoTest.findUnique({
      where: { id: videoTest.id },
      include: { clips: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ test: created }, { status: 201 });
  } catch (error) {
    console.error("[VIDEO_TEST_USER][POST]", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
