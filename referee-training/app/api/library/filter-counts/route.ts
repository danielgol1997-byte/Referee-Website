import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildVideoClipWhereForAdmin, buildVideoClipWhereForUser } from "@/lib/video-test-filters";

type CountsByCategory = Record<string, Record<string, number>>;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const scope =
    body?.scope === "admin-video-tests"
      ? "admin-video-tests"
      : body?.scope === "user-video-tests"
        ? "user-video-tests"
      : body?.scope === "admin"
        ? "admin"
        : "user";
  const filters = body?.filters ?? {};

  if ((scope === "admin" || scope === "admin-video-tests") && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where =
    scope === "admin" || scope === "admin-video-tests"
      ? {
          AND: [
            buildVideoClipWhereForAdmin(filters),
            ...(scope === "admin-video-tests" ? [{ isEducational: false }] : []),
          ],
        }
      : {
          AND: [
            buildVideoClipWhereForUser(filters),
            ...(scope === "user-video-tests" ? [{ isEducational: false }] : []),
          ],
        };

  const videos = await prisma.videoClip.findMany({
    where,
    select: { id: true },
  });

  if (scope === "admin" || scope === "admin-video-tests") {
    // Admin: run two count sets
    // 1. categoryCounts: exclude category from filter so all categories always show with their counts
    // 2. countsByCategory: full filters for restarts/criteria/sanctions (only options in category-filtered videos)
    const whereForCategoryCounts = {
      AND: [
        buildVideoClipWhereForAdmin(filters, {
          excludeTagCategory: "category",
        }),
        ...(scope === "admin-video-tests" ? [{ isEducational: false }] : []),
      ],
    };
    const categoryVideos = await prisma.videoClip.findMany({
      where: whereForCategoryCounts,
      select: { id: true },
    });
    const categoryVideoIds = categoryVideos.map((v) => v.id);

    const [groupedFull, groupedCategory] = await Promise.all([
      videos.length > 0
        ? prisma.videoTag.groupBy({
            by: ["tagId"],
            where: {
              videoId: { in: videos.map((v) => v.id) },
              tag: { isActive: true, category: { isActive: true } },
            },
            _count: { videoId: true },
          })
        : [],
      categoryVideoIds.length > 0
        ? prisma.videoTag.groupBy({
            by: ["tagId"],
            where: {
              videoId: { in: categoryVideoIds },
              tag: { isActive: true, category: { isActive: true } },
            },
            _count: { videoId: true },
          })
        : [],
    ]);

    const allTagIds = new Set([
      ...groupedFull.map((r) => r.tagId),
      ...groupedCategory.map((r) => r.tagId),
    ]);
    const tags =
      allTagIds.size > 0
        ? await prisma.tag.findMany({
            where: { id: { in: Array.from(allTagIds) } },
            select: {
              id: true,
              slug: true,
              category: { select: { slug: true } },
            },
          })
        : [];
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    const countsByCategory: CountsByCategory = {};
    const categoryTagCounts: Record<string, number> = {};

    for (const row of groupedFull) {
      const tag = tagMap.get(row.tagId);
      const categorySlug = tag?.category?.slug;
      const tagSlug = tag?.slug;
      if (!categorySlug || !tagSlug) continue;
      if (!countsByCategory[categorySlug]) countsByCategory[categorySlug] = {};
      countsByCategory[categorySlug][tagSlug] = row._count.videoId;
    }

    for (const row of groupedCategory) {
      const tag = tagMap.get(row.tagId);
      const categorySlug = tag?.category?.slug;
      const tagSlug = tag?.slug;
      if (!categorySlug || !tagSlug) continue;
      if (categorySlug === "category") {
        categoryTagCounts[tagSlug] = row._count.videoId;
      }
    }

    // Use categoryTagCounts for category filter; countsByCategory for the rest
    const mergedCounts: CountsByCategory = {
      ...countsByCategory,
      category: { ...countsByCategory.category, ...categoryTagCounts },
    };
    // Overwrite category with independent counts (so Challenges+Offside both show their totals)
    if (Object.keys(categoryTagCounts).length > 0) {
      mergedCounts.category = categoryTagCounts;
    }

    return NextResponse.json({
      totalMatchingVideos: videos.length,
      countsByCategory: mergedCounts,
    });
  }

  if (videos.length === 0) {
    return NextResponse.json({ totalMatchingVideos: 0, countsByCategory: {} as CountsByCategory });
  }

  const videoIds = videos.map((v) => v.id);
  const grouped = await prisma.videoTag.groupBy({
    by: ["tagId"],
    where: {
      videoId: { in: videoIds },
      tag: { isActive: true, category: { isActive: true } },
    },
    _count: {
      videoId: true,
    },
  });

  const tagIds = grouped.map((row) => row.tagId);
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: {
      id: true,
      slug: true,
      category: {
        select: {
          slug: true,
        },
      },
    },
  });
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  const countsByCategory: CountsByCategory = {};
  for (const row of grouped) {
    const tag = tagMap.get(row.tagId);
    const categorySlug = tag?.category?.slug;
    const tagSlug = tag?.slug;
    if (!categorySlug || !tagSlug) continue;
    if (!countsByCategory[categorySlug]) countsByCategory[categorySlug] = {};
    countsByCategory[categorySlug][tagSlug] = row._count.videoId;
  }

  return NextResponse.json({
    totalMatchingVideos: videos.length,
    countsByCategory,
  });
}
