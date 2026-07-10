import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/api-auth';

const VIDEO_TEST_TAG_CATEGORY_SLUGS = new Set(['restarts', 'sanction', 'criteria']);

/**
 * GET /api/admin/library/tags
 * List all tags
 * Requires SUPER_ADMIN role
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const tags = await prisma.tag.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            canBeCorrectAnswer: true,
            allowLinks: true,
            order: true,
            color: true,
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

    if (!session || !session.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      isPlayOnCriteria,
    } = body;

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

    // Check for duplicate name within the same category and parentCategory
    const existingName = await prisma.tag.findFirst({
      where: { name, categoryId, parentCategory: parentCategory || null },
    });

    if (existingName) {
      return NextResponse.json(
        { error: 'Tag with this name already exists in this category' },
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

    const category = await prisma.tagCategory.findUnique({
      where: { id: categoryId },
      select: { allowLinks: true, slug: true },
    });

    const usageControlled = !!category?.slug && VIDEO_TEST_TAG_CATEGORY_SLUGS.has(category.slug);
    const isCriteriaCategory = category?.slug === 'criteria';
    const nextUseInVideoLibrary = usageControlled
      ? (useInVideoLibrary !== undefined ? !!useInVideoLibrary : true)
      : true;
    const nextUseInVideoTests = usageControlled
      ? (useInVideoTests !== undefined ? !!useInVideoTests : true)
      : true;
    const nextIsPlayOnCriteria = isCriteriaCategory
      ? (isPlayOnCriteria !== undefined ? !!isPlayOnCriteria : false)
      : false;

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
        linkUrl: category?.allowLinks ? linkUrl : null,
        useInVideoLibrary: nextUseInVideoLibrary,
        useInVideoTests: nextUseInVideoTests,
        isPlayOnCriteria: nextIsPlayOnCriteria,
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
    console.error('Error creating tag:', error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        error: 'Failed to create tag',
        details: process.env.NODE_ENV === 'development' ? errorDetails.message : undefined
      },
      { status: 500 }
    );
  }
}
