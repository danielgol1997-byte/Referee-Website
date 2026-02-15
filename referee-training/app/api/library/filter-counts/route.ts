import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildVideoClipWhereForAdmin, buildVideoClipWhereForUser } from "@/lib/video-test-filters";

type CountsByCategory = Record<string, Record<string, number>>;

/**
 * Efficient helper: run groupBy on VideoTag using a relation-based WHERE
 * instead of fetching all video IDs into JS first.
 * Prisma translates `video: { ... }` into a SQL subquery / EXISTS clause.
 */
async function countTagsByVideoWhere(videoWhere: any) {
  const grouped = await prisma.videoTag.groupBy({
    by: ["tagId"],
    where: {
      video: videoWhere,
      tag: { isActive: true, category: { isActive: true } },
    },
    _count: { videoId: true },
  });
  return grouped;
}

/**
 * Resolve tagIds → { categorySlug, tagSlug } in a single query.
 */
async function resolveTagSlugs(tagIds: string[]) {
  if (tagIds.length === 0) return new Map<string, { categorySlug: string; tagSlug: string }>();
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: {
      id: true,
      slug: true,
      category: { select: { slug: true } },
    },
  });
  return new Map(
    tags.map((t) => [t.id, { categorySlug: t.category?.slug ?? "", tagSlug: t.slug }])
  );
}

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

  const isAdmin = scope === "admin" || scope === "admin-video-tests";
  const educationalClause = scope === "admin-video-tests" || scope === "user-video-tests"
    ? [{ isEducational: false }]
    : [];

  // Build the video WHERE clause (relation-based, never fetches IDs into JS)
  const baseVideoWhere = isAdmin
    ? { AND: [buildVideoClipWhereForAdmin(filters), ...educationalClause] }
    : { AND: [buildVideoClipWhereForUser(filters), ...educationalClause] };

  if (isAdmin) {
    // Admin: two parallel groupBy queries using relation-based filtering
    // 1. Full filters → counts for non-category dropdowns
    // 2. Filters excluding "category" → independent counts for category dropdown
    const categoryExcludedWhere = {
      AND: [
        buildVideoClipWhereForAdmin(filters, { excludeTagCategory: "category" }),
        ...educationalClause,
      ],
    };

    const [groupedFull, groupedCategory, totalCount] = await Promise.all([
      countTagsByVideoWhere(baseVideoWhere),
      countTagsByVideoWhere(categoryExcludedWhere),
      prisma.videoClip.count({ where: baseVideoWhere }),
    ]);

    // Resolve all tag IDs in one batch
    const allTagIds = new Set([
      ...groupedFull.map((r) => r.tagId),
      ...groupedCategory.map((r) => r.tagId),
    ]);
    const tagMap = await resolveTagSlugs(Array.from(allTagIds));

    const countsByCategory: CountsByCategory = {};
    const categoryTagCounts: Record<string, number> = {};

    for (const row of groupedFull) {
      const info = tagMap.get(row.tagId);
      if (!info?.categorySlug || !info.tagSlug) continue;
      if (!countsByCategory[info.categorySlug]) countsByCategory[info.categorySlug] = {};
      countsByCategory[info.categorySlug][info.tagSlug] = row._count.videoId;
    }

    for (const row of groupedCategory) {
      const info = tagMap.get(row.tagId);
      if (!info?.categorySlug || !info.tagSlug) continue;
      if (info.categorySlug === "category") {
        categoryTagCounts[info.tagSlug] = row._count.videoId;
      }
    }

    const mergedCounts: CountsByCategory = { ...countsByCategory };
    if (Object.keys(categoryTagCounts).length > 0) {
      mergedCounts.category = categoryTagCounts;
    }

    return NextResponse.json({
      totalMatchingVideos: totalCount,
      countsByCategory: mergedCounts,
    });
  }

  // Non-admin path
  const [grouped, totalCount] = await Promise.all([
    countTagsByVideoWhere(baseVideoWhere),
    prisma.videoClip.count({ where: baseVideoWhere }),
  ]);

  const tagMap = await resolveTagSlugs(grouped.map((r) => r.tagId));

  const countsByCategory: CountsByCategory = {};
  for (const row of grouped) {
    const info = tagMap.get(row.tagId);
    if (!info?.categorySlug || !info.tagSlug) continue;
    if (!countsByCategory[info.categorySlug]) countsByCategory[info.categorySlug] = {};
    countsByCategory[info.categorySlug][info.tagSlug] = row._count.videoId;
  }

  return NextResponse.json({
    totalMatchingVideos: totalCount,
    countsByCategory,
  });
}
