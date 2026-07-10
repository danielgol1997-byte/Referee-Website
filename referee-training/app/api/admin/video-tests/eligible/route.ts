import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVideoClipWhereForAdmin } from "@/lib/video-test-filters";
import { requireAdmin } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/roles";
import { contentWhere } from "@/lib/scope";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => ({}));
    const filters = body?.filters ?? {};
    const limit = typeof body?.limit === "number" ? body.limit : 500;

    // Super admins draw from all clips; FA admins from global + their own FA.
    const clipScope = isSuperAdmin(auth.user.role) ? {} : contentWhere(auth.user.associationId);

    const where = {
      AND: [
        buildVideoClipWhereForAdmin(filters),
        { isEducational: false },
        clipScope,
      ],
    };

    const total = await prisma.videoClip.count({ where });
    const clips = await prisma.videoClip.findMany({
      where,
      select: {
        id: true,
        title: true,
        fileUrl: true,
        thumbnailUrl: true,
        duration: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: { select: { slug: true, name: true } },
              },
            },
          },
        },
        videoTestClips: {
          where: {
            videoTest: {
              type: { in: ["PUBLIC", "MANDATORY"] },
            },
          },
          select: {
            videoTest: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = clips.map((clip) => ({
      id: clip.id,
      title: clip.title,
      fileUrl: clip.fileUrl,
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      categoryTagLabel:
        clip.tags
          ?.filter((t) => t.tag?.category?.slug === "category")
          .map((t) => t.tag?.name)
          .filter(Boolean)
          .join(", ") || null,
      usedInTests: clip.videoTestClips
        .map((entry) => entry.videoTest)
        .filter(
          (test): test is { id: string; name: string; type: "PUBLIC" | "MANDATORY" | "USER" } =>
            Boolean(test)
        )
        .filter((test) => test.type !== "USER")
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "MANDATORY" ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    }));

    return NextResponse.json({ clips: formatted, count: formatted.length, total });
  } catch (error) {
    console.error("[ADMIN][VIDEO_TESTS_ELIGIBLE][POST]", error);
    return NextResponse.json({ error: "Failed to load eligible clips" }, { status: 500 });
  }
}
