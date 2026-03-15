import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const VIDEO_TEST_TAG_CATEGORY_SLUGS = new Set(['restarts', 'sanction', 'criteria']);

/**
 * PATCH /api/admin/library/tags/[id]
 * Partially update a tag
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
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.parentCategory !== undefined) updateData.parentCategory = body.parentCategory;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const currentTag = await prisma.tag.findUnique({
      where: { id },
      select: { name: true, categoryId: true, useInVideoLibrary: true, useInVideoTests: true, slug: true },
    });
    if (!currentTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }
    const targetCategoryId = updateData.categoryId || currentTag?.categoryId;
    const targetName = updateData.name || currentTag.name;
    if (updateData.name !== undefined || updateData.categoryId !== undefined) {
      const existingName = await prisma.tag.findFirst({
        where: {
          name: targetName,
          categoryId: targetCategoryId,
          id: { not: id },
        },
      });
      if (existingName) {
        return NextResponse.json(
          { error: 'Tag with this name already exists in this category' },
          { status: 409 }
        );
      }
    }
    const category = targetCategoryId
      ? await prisma.tagCategory.findUnique({
          where: { id: targetCategoryId },
          select: { allowLinks: true, slug: true },
        })
      : null;

    if (!category?.allowLinks) {
      updateData.linkUrl = null;
    }
    const usageControlled = !!category?.slug && VIDEO_TEST_TAG_CATEGORY_SLUGS.has(category.slug);
    if (usageControlled) {
      if (body.useInVideoLibrary !== undefined) updateData.useInVideoLibrary = !!body.useInVideoLibrary;
      if (body.useInVideoTests !== undefined) updateData.useInVideoTests = !!body.useInVideoTests;
    } else {
      updateData.useInVideoLibrary = true;
      updateData.useInVideoTests = true;
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    console.log('✅ Tag partially updated:', { id, fields: Object.keys(updateData) });
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    const prismaErrorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Unknown error';
    if (prismaErrorCode === 'P2002') {
      return NextResponse.json(
        { error: 'Tag with this name already exists in this category' },
        { status: 409 }
      );
    }
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update tag',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/library/tags/[id]
 * Update a tag
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
    const {
      name,
      slug,
      categoryId,
      parentCategory,
      color,
      description,
      order,
      isActive,
      linkUrl,
      useInVideoLibrary,
      useInVideoTests,
    } = body;

    // Get current tag to check if name changed
    const currentTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!currentTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    const nextName = name ?? currentTag.name;
    const nextCategoryId = categoryId ?? currentTag.categoryId;
    if (nextName !== currentTag.name || nextCategoryId !== currentTag.categoryId) {
      const existingName = await prisma.tag.findFirst({
        where: {
          name: nextName,
          categoryId: nextCategoryId,
          id: { not: id },
        },
      });

      if (existingName) {
        return NextResponse.json(
          { error: 'Tag with this name already exists in this category' },
          { status: 409 }
        );
      }
    }

    // Generate slug if not provided and name changed
    const generateSlug = (baseName: string): string => {
      return baseName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    let finalSlug = slug;
    
    // If name changed and no slug provided, regenerate slug
    if (!slug && name && name !== currentTag.name) {
      finalSlug = generateSlug(name);
    } else if (!slug) {
      // Keep existing slug if name didn't change
      finalSlug = currentTag.slug;
    }

    // Check for duplicate slug (excluding current tag)
    if (finalSlug) {
      let tagSlug = finalSlug;
      let counter = 1;
      const baseSlug = tagSlug;
      
      while (true) {
        const existing = await prisma.tag.findFirst({
          where: {
            slug: tagSlug,
            id: { not: id },
          },
        });

        if (!existing) {
          finalSlug = tagSlug;
          break; // Slug is available
        }

        // Slug exists, try with a number suffix
        tagSlug = `${baseSlug}-${counter}`;
        counter++;

        // Safety check to prevent infinite loop
        if (counter > 1000) {
          return NextResponse.json(
            { error: 'Unable to generate unique slug. Please provide a custom slug.' },
            { status: 400 }
          );
        }
      }
    }

    const category = categoryId
      ? await prisma.tagCategory.findUnique({
          where: { id: categoryId },
          select: { allowLinks: true, slug: true },
        })
      : null;
    const usageControlled = !!category?.slug && VIDEO_TEST_TAG_CATEGORY_SLUGS.has(category.slug);
    const nextUseInVideoLibrary = usageControlled
      ? (useInVideoLibrary !== undefined ? !!useInVideoLibrary : currentTag.useInVideoLibrary)
      : true;
    const nextUseInVideoTests = usageControlled
      ? (useInVideoTests !== undefined ? !!useInVideoTests : currentTag.useInVideoTests)
      : true;

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug: finalSlug,
        categoryId,
        parentCategory,
        color,
        description,
        order,
        isActive,
        linkUrl: category?.allowLinks ? linkUrl : null,
        useInVideoLibrary: nextUseInVideoLibrary,
        useInVideoTests: nextUseInVideoTests,
      },
      include: {
        category: true,
      },
    });

    // Verify update persisted
    const verifyUpdated = await prisma.tag.findUnique({
      where: { id },
    });

    if (!verifyUpdated || verifyUpdated.name !== name) {
      console.error('CRITICAL: Update did not persist!', { id, expected: name, actual: verifyUpdated?.name });
      return NextResponse.json(
        { error: 'Update operation did not persist. Database may not be saving changes.' },
        { status: 500 }
      );
    }

    console.log('✅ Tag updated successfully:', { id, name: tag.name, category: tag.category });
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    const prismaErrorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    const errorDetails =
      typeof error === 'object' && error !== null
        ? {
            message:
              'message' in error ? String((error as { message?: unknown }).message) : undefined,
            code: 'code' in error ? (error as { code?: unknown }).code : undefined,
            meta: 'meta' in error ? (error as { meta?: unknown }).meta : undefined,
          }
        : { message: String(error) };
    if (prismaErrorCode === 'P2002') {
      return NextResponse.json(
        { error: 'Tag with this name already exists in this category' },
        { status: 409 }
      );
    }
    console.error('Error updating tag:', error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        error: 'Failed to update tag',
        details: process.env.NODE_ENV === 'development' ? errorDetails.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/library/tags/[id]
 * Delete a tag
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
    // Check if tag is in use
    const usageCount = await prisma.videoTag.count({
      where: { tagId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete tag. It is used by ${usageCount} video(s). Please remove the tag from all videos first.`,
          usageCount,
        },
        { status: 409 }
      );
    }

    // Delete tag
    const deletedTag = await prisma.tag.delete({
      where: { id },
    });

    // Verify deletion by attempting to find it
    const verifyDeleted = await prisma.tag.findUnique({
      where: { id },
    });

    if (verifyDeleted) {
      console.error('CRITICAL: Tag still exists after delete operation!', { id, name: deletedTag.name });
      return NextResponse.json(
        { error: 'Delete operation did not persist. Database may not be saving changes.' },
        { status: 500 }
      );
    }

    console.log('✅ Tag deleted successfully:', { id, name: deletedTag.name });
    return NextResponse.json({ success: true, deleted: deletedTag });
  } catch (error: unknown) {
    const errorDetails =
      typeof error === 'object' && error !== null
        ? {
            message:
              'message' in error ? String((error as { message?: unknown }).message) : undefined,
            code: 'code' in error ? (error as { code?: unknown }).code : undefined,
            meta: 'meta' in error ? (error as { meta?: unknown }).meta : undefined,
          }
        : { message: String(error) };
    console.error('Error deleting tag:', error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        error: 'Failed to delete tag',
        details: process.env.NODE_ENV === 'development' ? errorDetails.message : undefined
      },
      { status: 500 }
    );
  }
}
