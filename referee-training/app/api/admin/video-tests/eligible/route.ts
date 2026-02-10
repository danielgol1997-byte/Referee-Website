import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVideoClipWhereForAdmin } from "@/lib/video-test-filters";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const filters = body?.filters ?? {};
    const limit = typeof body?.limit === "number" ? body.limit : 500;

    const where = buildVideoClipWhereForAdmin(filters);

    const total = await prisma.videoClip.count({ where });
    const clips = await prisma.videoClip.findMany({
      where,
      select: {
        id: true,
        title: true,
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
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = clips.map((clip) => ({
      id: clip.id,
      title: clip.title,
      thumbnailUrl: clip.thumbnailUrl,
      duration: clip.duration,
      categoryTagLabel:
        clip.tags
          ?.filter((t) => t.tag?.category?.slug === "category")
          .map((t) => t.tag?.name)
          .filter(Boolean)
          .join(", ") || null,
    }));

    return NextResponse.json({ clips: formatted, count: formatted.length, total });
  } catch (error) {
    console.error("[ADMIN][VIDEO_TESTS_ELIGIBLE][POST]", error);
    return NextResponse.json({ error: "Failed to load eligible clips" }, { status: 500 });
  }
}
