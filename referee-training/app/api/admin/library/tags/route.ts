import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/library/tags
 * List all tags
 * Requires SUPER_ADMIN role
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            canBeCorrectAnswer: true,
            order: true,
          }
        },
        _count: {
          select: { videos: true },
        },
      },
      orderBy: [
        { category: { order: 'asc' } },
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/tags
 * Create a new tag
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, categoryId, parentCategory, color, description, order, isActive } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Missing required field: categoryId' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingName = await prisma.tag.findUnique({
      where: { name },
    });

    if (existingName) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      );
    }

    // Generate slug if not provided (sanitize and handle special characters)
    const generateSlug = (baseName: string): string => {
      return baseName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    let tagSlug = slug || generateSlug(name);

    // If slug already exists, append a number to make it unique
    let counter = 1;
    const baseSlug = tagSlug;
    while (true) {
      const existing = await prisma.tag.findUnique({
        where: { slug: tagSlug },
      });

      if (!existing) {
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

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        name,
        slug: tagSlug,
        categoryId,
        parentCategory,
        color,
        description,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        category: true,
      },
    });

    // Verify creation persisted
    const verifyCreated = await prisma.tag.findUnique({
      where: { id: tag.id },
    });

    if (!verifyCreated || verifyCreated.name !== name) {
      console.error('CRITICAL: Tag creation did not persist!', { id: tag.id, expected: name, actual: verifyCreated?.name });
      return NextResponse.json(
        { error: 'Create operation did not persist. Database may not be saving changes.' },
        { status: 500 }
      );
    }

    console.log('✅ Tag created successfully:', { id: tag.id, name: tag.name, category: tag.category });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { 
        error: 'Failed to create tag',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
