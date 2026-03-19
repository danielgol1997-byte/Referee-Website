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
      include: { tags: { where: { isActive: true, useInVideoTests: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const orderedClips = clipIds.map((id) => clipMap.get(id)).filter(Boolean);

  const tagOptions: {
    restarts: { id: string; slug: string; name: string }[];
    sanction: { id: string; slug: string; name: string }[];
    criteria: { id: string; slug: string; name: string; isPlayOnCriteria: boolean }[];
  } = { restarts: [], sanction: [], criteria: [] };

  for (const cat of tagCategories) {
    if (cat.slug === "restarts") {
      tagOptions.restarts = cat.tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
    } else if (cat.slug === "sanction") {
      tagOptions.sanction = cat.tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
    } else if (cat.slug === "criteria") {
      tagOptions.criteria = cat.tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name, isPlayOnCriteria: t.isPlayOnCriteria }));
    }
  }

  const criteriaCategory = tagCategories.find((cat) => cat.slug === "criteria");
  const criteriaByClipId: Record<string, { id: string; slug: string; name: string; isPlayOnCriteria: boolean }[]> = {};

  const LENDING_GROUP = new Set([
    "challenges", "dogso", "spa", "holding",
    "illegal use of arms", "penalty area decisions", "simulation",
  ]);
  const MIN_CRITERIA_PER_TYPE = 7;

  function shuffle<T>(arr: T[]): T[] {
    const s = [...arr];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  }

  type CriteriaTag = { id: string; slug: string; name: string; parentCategory: string | null; isPlayOnCriteria: boolean; order: number; isActive: boolean; [k: string]: unknown };

  if (criteriaCategory) {
    const allCriteriaTags = criteriaCategory.tags as CriteriaTag[];

    for (const video of orderedClips) {
      if (!video) continue;
      const clipCategoryNames = new Set(
        video.tags
          .filter((entry) => entry.tag.category?.slug === "category")
          .map((entry) => entry.tag.name)
      );

      const nativeCriteria: CriteriaTag[] = allCriteriaTags
        .filter((tag) => !tag.parentCategory || clipCategoryNames.has(tag.parentCategory));

      const clipInLendingGroup = [...clipCategoryNames].some(
        (name) => LENDING_GROUP.has(name.toLowerCase())
      );

      if (clipInLendingGroup) {
        const nativeIds = new Set(nativeCriteria.map((t) => t.id));
        const playOnCount = nativeCriteria.filter((t) => t.isPlayOnCriteria).length;
        const offenseCount = nativeCriteria.filter((t) => !t.isPlayOnCriteria).length;
        const playOnDeficit = Math.max(0, MIN_CRITERIA_PER_TYPE - playOnCount);
        const offenseDeficit = Math.max(0, MIN_CRITERIA_PER_TYPE - offenseCount);

        if (playOnDeficit > 0 || offenseDeficit > 0) {
          const clipCatLower = new Set([...clipCategoryNames].map((n) => n.toLowerCase()));
          const lendingPool: CriteriaTag[] = allCriteriaTags.filter((tag) => {
            if (nativeIds.has(tag.id)) return false;
            if (!tag.parentCategory) return false;
            const parentLower = tag.parentCategory.toLowerCase();
            return LENDING_GROUP.has(parentLower) && !clipCatLower.has(parentLower);
          });

          const fillers: CriteriaTag[] = [];
          if (playOnDeficit > 0) {
            fillers.push(...shuffle(lendingPool.filter((t) => t.isPlayOnCriteria)).slice(0, playOnDeficit));
          }
          if (offenseDeficit > 0) {
            const alreadyUsedIds = new Set(fillers.map((f) => f.id));
            fillers.push(
              ...shuffle(lendingPool.filter((t) => !t.isPlayOnCriteria && !alreadyUsedIds.has(t.id))).slice(0, offenseDeficit)
            );
          }

          const combined = [...nativeCriteria, ...fillers];
          criteriaByClipId[video.id] = combined.map((tag) => ({
            id: tag.id, slug: tag.slug, name: tag.name, isPlayOnCriteria: tag.isPlayOnCriteria,
          }));
        } else {
          criteriaByClipId[video.id] = nativeCriteria.map((tag) => ({
            id: tag.id, slug: tag.slug, name: tag.name, isPlayOnCriteria: tag.isPlayOnCriteria,
          }));
        }
      } else {
        criteriaByClipId[video.id] = nativeCriteria.map((tag) => ({
          id: tag.id, slug: tag.slug, name: tag.name, isPlayOnCriteria: tag.isPlayOnCriteria,
        }));
      }
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
