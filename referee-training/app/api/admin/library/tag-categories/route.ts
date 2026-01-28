import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/library/tag-categories
 * List all tag categories
 * Requires SUPER_ADMIN role
 */
export async function GET(request: Request) {
  // #region agent log
  console.log('[DEBUG H1,H2] GET /api/admin/library/tag-categories - Handler entry', {timestamp: new Date().toISOString()});
  // #endregion
  try {
    const session = await getServerSession(authOptions);
    // #region agent log
    console.log('[DEBUG H2] Session check', {hasSession: !!session, hasUser: !!session?.user, role: session?.user?.role, userId: session?.user?.id});
    // #endregion

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      // #region agent log
      console.log('[DEBUG H2] Unauthorized - returning 401', {hasSession: !!session, hasUser: !!session?.user, role: session?.user?.role});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // #region agent log
    console.log('[DEBUG H3,H4,H5] Before Prisma query tagCategory.findMany');
    // #endregion
    const tagCategories = await prisma.tagCategory.findMany({
      include: {
        _count: {
          select: { tags: true },
        },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });
    // #region agent log
    console.log('[DEBUG H1,H3,H5] Prisma query successful', {count: tagCategories.length, firstCategoryName: tagCategories[0]?.name, firstCategoryId: tagCategories[0]?.id});
    // #endregion

    return NextResponse.json({ tagCategories });
  } catch (error: any) {
    // #region agent log
    console.error('[DEBUG H1,H3,H4,H5] Error caught in GET handler', {
      errorName: error?.constructor?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorMeta: error?.meta,
      errorStack: error?.stack,
      prismaErrorType: error?.constructor?.name?.includes('Prisma') ? 'Prisma Error' : 'Other Error'
    });
    // #endregion
    console.error('Error fetching tag categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/library/tag-categories
 * Create a new tag category
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, color, canBeCorrectAnswer, allowLinks, order, isActive } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingName = await prisma.tagCategory.findUnique({
      where: { name },
    });

    if (existingName) {
      return NextResponse.json(
        { error: 'Tag category with this name already exists' },
        { status: 409 }
      );
    }

    // Generate slug if not provided
    const generateSlug = (baseName: string): string => {
      return baseName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };

    let categorySlug = slug || generateSlug(name);

    // If slug already exists, append a number to make it unique
    let counter = 1;
    const baseSlug = categorySlug;
    while (true) {
      const existing = await prisma.tagCategory.findUnique({
        where: { slug: categorySlug },
      });

      if (!existing) {
        break;
      }

      categorySlug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 1000) {
        return NextResponse.json(
          { error: 'Unable to generate unique slug. Please provide a custom slug.' },
          { status: 400 }
        );
      }
    }

    // Create tag category
    const tagCategory = await prisma.tagCategory.create({
      data: {
        name,
        slug: categorySlug,
        description,
        color: color || null,
        canBeCorrectAnswer: canBeCorrectAnswer !== undefined ? canBeCorrectAnswer : false,
        allowLinks: allowLinks !== undefined ? allowLinks : false,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    console.log('✅ Tag category created successfully:', { 
      id: tagCategory.id, 
      name: tagCategory.name, 
      canBeCorrectAnswer: tagCategory.canBeCorrectAnswer 
    });
    return NextResponse.json({ tagCategory }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tag category:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create tag category',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
