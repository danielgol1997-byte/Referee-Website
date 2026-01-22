import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * PUT /api/admin/library/decision-types/[id]
 * Update a decision type
 * Requires SUPER_ADMIN role
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color, description, isActive, order } = body;

    // Generate new slug if name changed
    const slug = name 
      ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : undefined;

    const decisionType = await prisma.decisionType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(color && { color }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(decisionType);
  } catch (error: any) {
    console.error('Error updating decision type:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A decision type with this name already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Decision type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update decision type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/library/decision-types/[id]
 * Delete a decision type
 * Requires SUPER_ADMIN role
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the decision type name first
    const decisionType = await prisma.decisionType.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!decisionType) {
      return NextResponse.json(
        { error: 'Decision type not found' },
        { status: 404 }
      );
    }

    // Find the CRITERIA tag category
    const criteriaCategory = await prisma.tagCategory.findUnique({
      where: { slug: 'criteria' },
      select: { id: true },
    });

    if (!criteriaCategory) {
      return NextResponse.json(
        { error: 'CRITERIA tag category not found' },
        { status: 500 }
      );
    }

    // Check if any tags use this decision type
    const tagCount = await prisma.tag.count({
      where: {
        categoryId: criteriaCategory.id,
        parentCategory: {
          in: [decisionType.name],
        },
      },
    });

    if (tagCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${tagCount} criteria tag(s) are using this decision type` },
        { status: 400 }
      );
    }

    await prisma.decisionType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting decision type:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Decision type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete decision type' },
      { status: 500 }
    );
  }
}
