import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/library/tags/bulk-update-rap
 * Bulk update rapCategory for all criteria tags with a specific parentCategory
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parentCategory, rapCategory } = body;

    if (!parentCategory) {
      return NextResponse.json(
        { error: 'parentCategory is required' },
        { status: 400 }
      );
    }

    const criteriaCategory = await prisma.tagCategory.findUnique({
      where: { slug: 'criteria' },
      select: { id: true },
    });

    if (!criteriaCategory) {
      return NextResponse.json(
        { error: 'Criteria tag category not found' },
        { status: 404 }
      );
    }

    // Update all CRITERIA tags that have this parentCategory
    const result = await prisma.tag.updateMany({
      where: {
        categoryId: criteriaCategory.id,
        parentCategory: parentCategory,
      },
      data: {
        rapCategory: rapCategory || null,
      },
    });

    console.log(`✅ Updated ${result.count} criteria tags with rapCategory: ${rapCategory || 'null'} for parentCategory: ${parentCategory}`);
    
    return NextResponse.json({ 
      success: true, 
      updatedCount: result.count,
      parentCategory,
      rapCategory 
    });
  } catch (error: any) {
    console.error('Error bulk updating RAP categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to bulk update RAP categories',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
