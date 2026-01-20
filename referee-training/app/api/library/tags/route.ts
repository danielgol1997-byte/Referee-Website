import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/library/tags
 * Public endpoint - fetch all active tags grouped by category
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        parentCategory: true,
        color: true,
        order: true,
      }
    });

    // Group tags by category
    const grouped = {
      CATEGORY: tags.filter(t => t.category === 'CATEGORY'),
      RESTARTS: tags.filter(t => t.category === 'RESTARTS'),
      CRITERIA: tags.filter(t => t.category === 'CRITERIA'),
      SANCTION: tags.filter(t => t.category === 'SANCTION'),
      SCENARIO: tags.filter(t => t.category === 'SCENARIO'),
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
