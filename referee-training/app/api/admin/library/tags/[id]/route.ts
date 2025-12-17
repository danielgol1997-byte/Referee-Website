import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, category, color, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if slug already exists (excluding current tag)
    const existing = await prisma.tag.findFirst({
      where: {
        slug,
        id: { not: id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        category: category || 'GENERAL',
        color,
        description,
        isActive: isActive !== false,
      }
    });

    return NextResponse.json({ tag, success: true });
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete associated video tags first
    await prisma.videoTag.deleteMany({
      where: { tagId: id }
    });

    // Delete the tag
    await prisma.tag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
