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

  const resolvedParams = await context.params;

  const videoSession = await prisma.videoTestSession.findUnique({
    where: { id: resolvedParams.sessionId },
    select: {
      id: true,
      userId: true,
      clipIds: true,
      totalClips: true,
      maxViewsPerClip: true,
      clipViewCounts: true,
      videoTest: {
        select: {
          id: true,
          type: true,
          name: true,
        },
      },
    },
  });

  if (!videoSession || videoSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const clipIds = videoSession.clipIds;
  const [clips, tagCategories] = await Promise.all([
    prisma.videoClip.findMany({
      where: { id: { in: clipIds }, isActive: true },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        thumbnailUrl: true,
        duration: true,
        playOn: true,
        noOffence: true,
        loopZoneStart: true,
        loopZoneEnd: true,
        decisionExplanation: true,
        keyPoints: true,
        commonMistakes: true,
        varNotes: true,
        isEducational: true,
        lawNumbers: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                slug: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    canBeCorrectAnswer: true,
                  },
                },
              },
            },
            isCorrectDecision: true,
            decisionOrder: true,
          },
        },
      },
    }),
    prisma.tagCategory.findMany({
      where: { slug: { in: ["restarts", "sanction", "criteria"] }, isActive: true },
      include: { tags: { where: { isActive: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const orderedClips = clipIds.map((id) => clipMap.get(id)).filter(Boolean);

  const tagOptions: Record<string, { id: string; slug: string; name: string }[]> = {
    restarts: [],
    sanction: [],
    criteria: [],
  };
  for (const cat of tagCategories) {
    const list = cat.tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
    if (cat.slug === "restarts") tagOptions.restarts = list;
    else if (cat.slug === "sanction") tagOptions.sanction = list;
    else if (cat.slug === "criteria") tagOptions.criteria = list;
  }

  const criteriaCategory = tagCategories.find((cat) => cat.slug === "criteria");
  const criteriaByClipId: Record<string, { id: string; slug: string; name: string }[]> = {};
  if (criteriaCategory) {
    for (const video of orderedClips) {
      if (!video) continue;
      const clipCategoryNames = new Set(
        video.tags
          .filter((entry) => entry.tag.category?.slug === "category")
          .map((entry) => entry.tag.name)
      );
      criteriaByClipId[video.id] = criteriaCategory.tags
        .filter((tag) => !tag.parentCategory || clipCategoryNames.has(tag.parentCategory))
        .map((tag) => ({ id: tag.id, slug: tag.slug, name: tag.name }));
    }
  }

  const formattedClips = orderedClips.map((video) => {
    if (!video) return null;
    return {
      id: video.id,
      title: video.title,
      fileUrl: video.fileUrl,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
      duration: video.duration ?? undefined,
      playOn: video.playOn,
      noOffence: video.noOffence,
      loopZoneStart: video.loopZoneStart ?? undefined,
      loopZoneEnd: video.loopZoneEnd ?? undefined,
      decisionExplanation: video.decisionExplanation ?? undefined,
      keyPoints: video.keyPoints ?? [],
      commonMistakes: video.commonMistakes ?? [],
      varNotes: video.varNotes ?? undefined,
      isEducational: video.isEducational,
      lawNumbers: video.lawNumbers,
      tags: video.tags.map((vt) => ({
        id: vt.tag.id,
        slug: vt.tag.slug,
        name: vt.tag.name,
        category: vt.tag.category
          ? {
              id: vt.tag.category.id,
              name: vt.tag.category.name,
              slug: vt.tag.category.slug,
              canBeCorrectAnswer: vt.tag.category.canBeCorrectAnswer,
            }
          : null,
        isCorrectDecision: vt.isCorrectDecision,
        decisionOrder: vt.decisionOrder,
      })),
    };
  });

  return NextResponse.json({
    clips: formattedClips.filter(Boolean),
    tagOptions,
    criteriaByClipId,
    totalClips: videoSession.totalClips,
    maxViewsPerClip: videoSession.maxViewsPerClip,
    clipViewCounts: videoSession.clipViewCounts ?? {},
    isMandatory: videoSession.videoTest?.type === "MANDATORY",
    testName: videoSession.videoTest?.name ?? null,
  });
}
