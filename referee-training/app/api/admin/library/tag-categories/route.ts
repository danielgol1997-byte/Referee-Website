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
  const debugInfo: any = { checkpoints: [], timestamp: new Date().toISOString() };
  debugInfo.checkpoints.push('Handler entry');
  // #endregion
  try {
    const session = await getServerSession(authOptions);
    // #region agent log
    debugInfo.checkpoints.push('Session retrieved');
    debugInfo.session = { hasSession: !!session, hasUser: !!session?.user, role: session?.user?.role, userId: session?.user?.id };
    // #endregion

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      // #region agent log
      debugInfo.checkpoints.push('Unauthorized check failed');
      // #endregion
      return NextResponse.json({ error: 'Unauthorized', debug: debugInfo }, { status: 401 });
    }

    // #region agent log
    debugInfo.checkpoints.push('Before Prisma query');
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
    debugInfo.checkpoints.push('Prisma query successful');
    debugInfo.result = { count: tagCategories.length, firstCategoryName: tagCategories[0]?.name };
    // #endregion

    return NextResponse.json({ tagCategories });
  } catch (error: any) {
    // #region agent log
    debugInfo.checkpoints.push('Error caught');
    debugInfo.error = {
      name: error?.constructor?.name,
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 5),
      isPrismaError: error?.constructor?.name?.includes('Prisma')
    };
    console.error('[DEBUG ERROR]', JSON.stringify(debugInfo, null, 2));
    // #endregion
    return NextResponse.json(
      { error: 'Failed to fetch tag categories', debug: debugInfo },
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
