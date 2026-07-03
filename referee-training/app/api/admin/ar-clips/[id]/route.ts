import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const clip = await prisma.arClip.findUnique({ where: { id } });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
  return NextResponse.json({ clip });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.arClip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.fileUrl === "string" && body.fileUrl) data.fileUrl = body.fileUrl;
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null) data.thumbnailUrl = body.thumbnailUrl;
  if (typeof body.duration === "number" && Number.isFinite(body.duration)) data.duration = body.duration;
  if (body.correctAnswer === "OFFSIDE" || body.correctAnswer === "ONSIDE") data.correctAnswer = body.correctAnswer;
  if (typeof body.passMomentTime === "number" && Number.isFinite(body.passMomentTime)) {
    data.passMomentTime = Math.max(body.passMomentTime, 0);
  } else if (body.passMomentTime === null) {
    data.passMomentTime = null;
  }
  if (typeof body.passFrameUrl === "string" || body.passFrameUrl === null) data.passFrameUrl = body.passFrameUrl;
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const clip = await prisma.arClip.update({ where: { id }, data });
  return NextResponse.json({ success: true, clip });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.arClip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  await prisma.arClip.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
