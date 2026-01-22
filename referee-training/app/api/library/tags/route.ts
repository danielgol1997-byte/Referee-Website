import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/library/tags
 * Public endpoint - fetch all active tags grouped by category
 */
export async function GET() {
  try {
    const tagCategories = await prisma.tagCategory.findMany({
      where: { isActive: true },
      include: {
        tags: {
          where: { isActive: true },
          orderBy: [
            { order: 'asc' },
            { name: 'asc' },
          ],
        },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      tagCategories: tagCategories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        canBeCorrectAnswer: category.canBeCorrectAnswer,
        order: category.order,
        tags: category.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          parentCategory: tag.parentCategory,
          color: tag.color,
          order: tag.order,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
