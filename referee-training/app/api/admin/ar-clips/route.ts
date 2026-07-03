import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ar-clips
 * List all AR clips (active and inactive) for the admin panel.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clips = await prisma.arClip.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { answers: true } },
    },
  });

  return NextResponse.json({
    clips: clips.map((c) => ({
      id: c.id,
      title: c.title,
      fileUrl: c.fileUrl,
      thumbnailUrl: c.thumbnailUrl,
      duration: c.duration,
      correctAnswer: c.correctAnswer,
      passMomentTime: c.passMomentTime,
      passFrameUrl: c.passFrameUrl,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt,
      timesAnswered: c._count.answers,
    })),
  });
}

/**
 * POST /api/admin/ar-clips
 * Create a new AR clip record (media must already be uploaded).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { title, fileUrl, thumbnailUrl, duration, correctAnswer, passMomentTime, passFrameUrl, description, isActive } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: "Video file is required" }, { status: 400 });
  }
  if (correctAnswer !== "OFFSIDE" && correctAnswer !== "ONSIDE") {
    return NextResponse.json({ error: "Correct answer must be OFFSIDE or ONSIDE" }, { status: 400 });
  }

  const clip = await prisma.arClip.create({
    data: {
      title: title.trim(),
      fileUrl,
      thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : null,
      duration: typeof duration === "number" && Number.isFinite(duration) ? duration : null,
      correctAnswer,
      passMomentTime:
        typeof passMomentTime === "number" && Number.isFinite(passMomentTime)
          ? Math.max(passMomentTime, 0)
          : null,
      passFrameUrl: typeof passFrameUrl === "string" ? passFrameUrl : null,
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      isActive: isActive !== false,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ success: true, clip });
}
