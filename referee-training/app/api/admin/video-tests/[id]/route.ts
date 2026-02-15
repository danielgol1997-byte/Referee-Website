import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { VideoTestType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVideoClipWhereForAdmin } from "@/lib/video-test-filters";

function shuffleArray<T>(array: T[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolvedParams = await params;

  try {
    const existing = await prisma.videoTest.findUnique({
      where: { id: resolvedParams.id },
      include: { clips: { include: { videoClip: { select: { id: true, title: true } } } } },
    });
    if (!existing || (existing.type !== VideoTestType.MANDATORY && existing.type !== VideoTestType.PUBLIC)) {
      return NextResponse.json({ error: "Video test not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
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
      isActive,
    } = body ?? {};

    // Visibility-only update (eyeball toggle)
    const keys = Object.keys(body ?? {});
    if (keys.length === 1 && keys[0] === "isActive" && typeof isActive === "boolean") {
      const updated = await prisma.videoTest.update({
        where: { id: resolvedParams.id },
        data: { isActive },
      });
      const testWithClips = await prisma.videoTest.findUnique({
        where: { id: updated.id },
        include: { clips: { orderBy: { order: "asc" }, include: { videoClip: { select: { id: true, title: true } } } } },
      });
      return NextResponse.json({ test: testWithClips });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!type || (type !== VideoTestType.MANDATORY && type !== VideoTestType.PUBLIC)) {
      return NextResponse.json({ error: "type must be MANDATORY or PUBLIC" }, { status: 400 });
    }
    const totalClipsNum = Number.isFinite(totalClips) ? Math.floor(totalClips as number) : 0;
    if (totalClipsNum <= 0) {
      return NextResponse.json({ error: "totalClips must be a positive number" }, { status: 400 });
    }

    const hasPassingScore =
      passingScore !== undefined && passingScore !== null && String(passingScore).trim() !== "";
    if (type === VideoTestType.MANDATORY && !hasPassingScore) {
      return NextResponse.json({ error: "passingScore is required for mandatory tests" }, { status: 400 });
    }
    if (hasPassingScore) {
      const numericPassingScore = Number(passingScore);
      if (!Number.isFinite(numericPassingScore) || numericPassingScore < 0 || numericPassingScore > 100) {
        return NextResponse.json({ error: "passingScore must be between 0 and 100" }, { status: 400 });
      }
    }

    const hasMaxViews =
      maxViewsPerClip !== undefined && maxViewsPerClip !== null && String(maxViewsPerClip).trim() !== "";
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

    if (filters) {
      const where = {
        AND: [
          buildVideoClipWhereForAdmin(filters),
          { isEducational: false },
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
    } else if (Array.isArray(selectedClipIds) && selectedClipIds.length > 0) {
      const uniqueChosen = Array.from(new Set(selectedClipIds));
      if (uniqueChosen.length < totalClipsNum) {
        return NextResponse.json({ error: "Selected clips must be at least total clips count" }, { status: 400 });
      }
      const count = await prisma.videoClip.count({
        where: { id: { in: uniqueChosen }, isActive: true, isEducational: false },
      });
      if (count !== uniqueChosen.length) {
        return NextResponse.json({ error: "Some selected clips are invalid or inactive" }, { status: 400 });
      }
      finalClipIds = uniqueChosen.slice(0, totalClipsNum);
    } else {
      if (!Array.isArray(clipIds) || clipIds.length === 0) {
        return NextResponse.json({ error: "clipIds must be a non-empty array of video clip IDs" }, { status: 400 });
      }

      const count = await prisma.videoClip.count({
        where: { id: { in: clipIds }, isActive: true, isEducational: false },
      });
      if (count !== clipIds.length) {
        return NextResponse.json({ error: "Some clip IDs are invalid or inactive" }, { status: 400 });
      }

      finalClipIds = clipIds.slice(0, Math.min(totalClipsNum, clipIds.length));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTest = await tx.videoTest.update({
        where: { id: resolvedParams.id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          type: type as VideoTestType,
          totalClips: totalClipsNum,
          passingScore: hasPassingScore ? Math.floor(Number(passingScore)) : null,
          maxViewsPerClip: hasMaxViews ? Math.floor(Number(maxViewsPerClip)) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          adminFilters: filters ?? null,
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        },
      });

      await tx.videoTestClip.deleteMany({
        where: { videoTestId: resolvedParams.id },
      });

      await tx.videoTestClip.createMany({
        data: finalClipIds.map((videoClipId: string, order: number) => ({
          videoTestId: resolvedParams.id,
          videoClipId,
          order,
        })),
      });

      return updatedTest;
    });

    const testWithClips = await prisma.videoTest.findUnique({
      where: { id: updated.id },
      include: { clips: { orderBy: { order: "asc" }, include: { videoClip: { select: { id: true, title: true } } } } },
    });

    return NextResponse.json({ test: testWithClips });
  } catch (error) {
    console.error("[ADMIN][VIDEO_TEST][PATCH]", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to update video test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolvedParams = await params;

  try {
    const existing = await prisma.videoTest.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, type: true },
    });
    if (!existing || (existing.type !== VideoTestType.MANDATORY && existing.type !== VideoTestType.PUBLIC)) {
      return NextResponse.json({ error: "Video test not found" }, { status: 404 });
    }

    await prisma.videoTest.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][VIDEO_TEST][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete video test" }, { status: 500 });
  }
}
