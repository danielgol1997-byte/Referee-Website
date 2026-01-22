import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * PATCH /api/admin/library/tag-categories/[id]
 * Partially update a tag category
 * Requires SUPER_ADMIN role
 */
export async function PATCH(
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

    // Allow partial updates - only update provided fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.canBeCorrectAnswer !== undefined) updateData.canBeCorrectAnswer = body.canBeCorrectAnswer;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const tagCategory = await prisma.tagCategory.update({
      where: { id },
      data: updateData,
    });

    console.log('✅ Tag category partially updated:', { id, fields: Object.keys(updateData) });
    return NextResponse.json({ tagCategory });
  } catch (error: any) {
    console.error('Error updating tag category:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update tag category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/library/tag-categories/[id]
 * Update a tag category
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
    const { name, slug, description, canBeCorrectAnswer, order, isActive } = body;

    // Get current tag category
    const currentCategory = await prisma.tagCategory.findUnique({
      where: { id },
    });

    if (!currentCategory) {
      return NextResponse.json(
        { error: 'Tag category not found' },
        { status: 404 }
      );
    }

    // Check if name is being updated to an existing name
    if (name && name !== currentCategory.name) {
      const existingName = await prisma.tagCategory.findUnique({
        where: { name },
      });

      if (existingName) {
        return NextResponse.json(
          { error: 'Tag category with this name already exists' },
          { status: 409 }
        );
      }
    }

    const tagCategory = await prisma.tagCategory.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        canBeCorrectAnswer,
        order,
        isActive,
      },
    });

    console.log('✅ Tag category updated successfully:', { id, name: tagCategory.name });
    return NextResponse.json({ tagCategory });
  } catch (error: any) {
    console.error('Error updating tag category:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update tag category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/library/tag-categories/[id]
 * Delete a tag category
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
    
    // Check if tag category has tags
    const tagCount = await prisma.tag.count({
      where: { categoryId: id },
    });

    if (tagCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete tag category. It has ${tagCount} tag(s). Please move or delete the tags first.`,
          tagCount,
        },
        { status: 409 }
      );
    }

    // Delete tag category
    const deletedCategory = await prisma.tagCategory.delete({
      where: { id },
    });

    console.log('✅ Tag category deleted successfully:', { id, name: deletedCategory.name });
    return NextResponse.json({ success: true, deleted: deletedCategory });
  } catch (error: any) {
    console.error('Error deleting tag category:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete tag category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
