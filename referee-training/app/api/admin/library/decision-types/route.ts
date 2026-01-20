import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/library/decision-types
 * Fetch all decision types (for CRITERIA grouping)
 * Requires SUPER_ADMIN role
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decisionTypes = await prisma.decisionType.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(decisionTypes);
  } catch (error) {
    console.error('Error fetching decision types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decision types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/decision-types
 * Create a new decision type
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Get max order
    const maxOrder = await prisma.decisionType.aggregate({
      _max: { order: true },
    });
    const order = (maxOrder._max.order || 0) + 1;

    const decisionType = await prisma.decisionType.create({
      data: {
        name,
        slug,
        color,
        description,
        order,
        isActive: true,
      },
    });

    return NextResponse.json(decisionType, { status: 201 });
  } catch (error: any) {
    console.error('Error creating decision type:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A decision type with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create decision type' },
      { status: 500 }
    );
  }
}
