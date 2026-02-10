import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVideoClipWhereForUser } from "@/lib/video-test-filters";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const filters = body?.filters ?? {};

    const where = buildVideoClipWhereForUser(filters);
    const count = await prisma.videoClip.count({ where });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[VIDEO_TESTS_ELIGIBLE][POST]", error);
    return NextResponse.json({ error: "Failed to load eligible videos" }, { status: 500 });
  }
}
