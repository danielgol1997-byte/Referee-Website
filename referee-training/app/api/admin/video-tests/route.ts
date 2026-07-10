import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VideoTestType } from "@prisma/client";
import { buildVideoClipWhereForAdmin } from "@/lib/video-test-filters";
import { requireAdmin } from "@/lib/api-auth";
import { contentWhere } from "@/lib/scope";

function shuffleArray<T>(array: T[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const where: Record<string, unknown> = {
    type: { in: [VideoTestType.MANDATORY, VideoTestType.PUBLIC] },
  };
  // FA admins see only global + their own association's tests.
  if (!isSuperAdmin(auth.user.role)) {
    Object.assign(where, contentWhere(auth.user.associationId));
  }

  const tests = await prisma.videoTest.findMany({
    where,
    include: { clips: { include: { videoClip: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tests });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const superAdmin = isSuperAdmin(auth.user.role);

  try {
    const body = await req.json();
    const {
      name,
      description,
      type,
      totalClips,
      passingScore,
      maxViewsPerClip,
      dueDate,
      clipIds,
      selectedClipIds,
      filters,
      isActive = false,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!type || (type !== VideoTestType.MANDATORY && type !== VideoTestType.PUBLIC)) {
      return NextResponse.json({ error: "type must be MANDATORY or PUBLIC" }, { status: 400 });
    }

    // Federation scope: FA admins' tests belong to their association and draw
    // only from global + own-association clips; super admins default to global.
    const associationId = superAdmin
      ? (typeof body?.associationId === "string" && body.associationId ? body.associationId : null)
      : auth.user.associationId;
    if (!superAdmin && !associationId) {
      return NextResponse.json({ error: "Your account is not linked to an association." }, { status: 400 });
    }
    const totalClipsNum = Number.isFinite(totalClips) ? Math.floor(totalClips as number) : 0;
    if (totalClipsNum <= 0) {
      return NextResponse.json({ error: "totalClips must be a positive number" }, { status: 400 });
    }

    const hasPassingScore = passingScore !== undefined && passingScore !== null && String(passingScore).trim() !== "";
    if (hasPassingScore) {
      const numericPassingScore = Number(passingScore);
      if (!Number.isFinite(numericPassingScore) || numericPassingScore < 0 || numericPassingScore > 100) {
        return NextResponse.json({ error: "passingScore must be between 0 and 100" }, { status: 400 });
      }
    }

    const hasMaxViews = maxViewsPerClip !== undefined && maxViewsPerClip !== null && String(maxViewsPerClip).trim() !== "";
    if (type === VideoTestType.MANDATORY && !hasMaxViews) {
      return NextResponse.json({ error: "maxViewsPerClip is required for mandatory tests" }, { status: 400 });
    }
    if (hasMaxViews) {
      const numericMaxViews = Number(maxViewsPerClip);
      if (!Number.isFinite(numericMaxViews) || numericMaxViews < 0) {
        return NextResponse.json({ error: "maxViewsPerClip must be zero or a positive number" }, { status: 400 });
      }
      if (type === VideoTestType.MANDATORY && numericMaxViews <= 0) {
        return NextResponse.json({ error: "mandatory tests must have at least 1 allowed view per clip" }, { status: 400 });
      }
    }

    const hasDueDate = dueDate !== undefined && dueDate !== null && String(dueDate).trim() !== "";
    if (type === VideoTestType.MANDATORY && !hasDueDate) {
      return NextResponse.json({ error: "dueDate is required for mandatory tests" }, { status: 400 });
    }

    let finalClipIds: string[] = [];

    // Super admins draw from all clips; FA admins from global + their own FA.
    const clipScope = superAdmin ? {} : contentWhere(auth.user.associationId);

    if (filters) {
      const where = {
        AND: [
          buildVideoClipWhereForAdmin(filters),
          { isEducational: false },
          clipScope,
        ],
      };
      const eligible = await prisma.videoClip.findMany({
        where,
        select: { id: true },
      });
      const eligibleIds = eligible.map((c) => c.id);

      if (eligibleIds.length === 0) {
        return NextResponse.json({ error: "No videos match the selected filters" }, { status: 400 });
      }

      if (totalClipsNum > eligibleIds.length) {
        return NextResponse.json({ error: "Not enough videos match the selected filters" }, { status: 400 });
      }

      const chosen = Array.isArray(selectedClipIds) ? selectedClipIds : [];
      const uniqueChosen = Array.from(new Set(chosen));

      if (uniqueChosen.length > totalClipsNum) {
        return NextResponse.json({ error: "Selected clips exceed total clips" }, { status: 400 });
      }

      const invalidSelection = uniqueChosen.some((id) => !eligibleIds.includes(id));
      if (invalidSelection) {
        return NextResponse.json({ error: "Selected clips are not in the filtered set" }, { status: 400 });
      }

      const remainingPool = eligibleIds.filter((id) => !uniqueChosen.includes(id));
      const randomFill = shuffleArray(remainingPool).slice(0, totalClipsNum - uniqueChosen.length);

      finalClipIds = [...uniqueChosen, ...randomFill];
    } else {
      if (!Array.isArray(clipIds) || clipIds.length === 0) {
        return NextResponse.json({ error: "clipIds must be a non-empty array of video clip IDs" }, { status: 400 });
      }

      const count = await prisma.videoClip.count({
        where: { id: { in: clipIds }, isActive: true, isEducational: false, ...clipScope },
      });
      if (count !== clipIds.length) {
        return NextResponse.json({ error: "Some clip IDs are invalid or inactive" }, { status: 400 });
      }

      finalClipIds = clipIds.slice(0, Math.min(totalClipsNum, clipIds.length));
    }

    const videoTest = await prisma.videoTest.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type as VideoTestType,
        totalClips: totalClipsNum,
        passingScore: hasPassingScore ? Math.floor(Number(passingScore)) : null,
        maxViewsPerClip: hasMaxViews ? Math.floor(Number(maxViewsPerClip)) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        adminFilters: filters ?? null,
        isActive: !!isActive,
        associationId,
        createdById: auth.user.id,
      },
    });

    await prisma.videoTestClip.createMany({
      data: finalClipIds.map((videoClipId: string, order: number) => ({
        videoTestId: videoTest.id,
        videoClipId,
        order,
      })),
    });

    const created = await prisma.videoTest.findUnique({
      where: { id: videoTest.id },
      include: { clips: { orderBy: { order: "asc" }, include: { videoClip: { select: { id: true, title: true } } } } },
    });

    return NextResponse.json({ test: created }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN][VIDEO_TEST][POST]", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to create video test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
