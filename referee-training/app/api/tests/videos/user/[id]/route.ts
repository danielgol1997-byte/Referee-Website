import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { VideoTestType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;

  try {
    const existing = await prisma.videoTest.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, type: true, createdById: true },
    });
    if (!existing || existing.type !== VideoTestType.USER) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    if (existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description =
      body?.description === null
        ? null
        : typeof body?.description === "string"
          ? body.description.trim()
          : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    const updateData: {
      name?: string;
      description?: string | null;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.videoTest.update({
      where: { id: resolvedParams.id },
      data: updateData,
    });

    return NextResponse.json({ test: updated });
  } catch (error) {
    console.error("[VIDEO_TEST_USER][PATCH]", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;

  try {
    const existing = await prisma.videoTest.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, type: true, createdById: true },
    });
    if (!existing || existing.type !== VideoTestType.USER) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    if (existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.videoTest.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VIDEO_TEST_USER][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
