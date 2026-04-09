import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/library/tags/reorder
 * Update the order of tags within a category.
 * Body: { tagIds: string[] }  — ordered array of tag IDs
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tagIds } = body as { tagIds: string[] };

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'tagIds must be a non-empty array' }, { status: 400 });
    }

    await prisma.$transaction(
      tagIds.map((id, index) =>
        prisma.tag.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering tags:', error);
    return NextResponse.json(
      { error: 'Failed to reorder tags' },
      { status: 500 }
    );
  }
}
