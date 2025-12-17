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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { videos: true }
        }
      },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, color, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if slug already exists
    const existing = await prisma.tag.findUnique({
      where: { slug }
    });

    if (existing) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
    }

    const tag = await prisma.tag.create({
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
    console.error('Create tag error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
