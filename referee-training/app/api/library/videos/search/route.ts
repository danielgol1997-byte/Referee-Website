import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get("q") || "";
    const lawsParam = searchParams.get("laws");
    const restartsParam = searchParams.get("restarts");
    const sanctionsParam = searchParams.get("sanctions");
    const tagsParam = searchParams.get("tags");
    const categorySlug = searchParams.get("category");
    
    // Parse filters
    const laws = lawsParam ? lawsParam.split(',').map(Number) : [];
    const restarts = restartsParam ? restartsParam.split(',') : [];
    const sanctions = sanctionsParam ? sanctionsParam.split(',') : [];
    const tags = tagsParam ? tagsParam.split(',') : [];

    // Build where clause
    const where: any = {
      isActive: true,
      AND: []
    };

    // Text search
    if (q) {
      where.AND.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      });
    }

    // Law filter
    if (laws.length > 0) {
      where.AND.push({
        lawNumbers: { hasSome: laws }
      });
    }

    // Restart filter
    if (restarts.length > 0) {
      where.AND.push({
        restartType: { in: restarts }
      });
    }

    // Sanction filter
    if (sanctions.length > 0) {
      where.AND.push({
        sanctionType: { in: sanctions }
      });
    }

    // Tag filter
    if (tags.length > 0) {
      where.AND.push({
        tags: {
          some: {
            tagId: { in: tags }
          }
        }
      });
    }

    // Category filter
    if (categorySlug) {
      where.AND.push({
        videoCategory: {
          slug: categorySlug
        }
      });
    }

    // If no filters, remove AND array
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Fetch videos
    const videos = await prisma.videoClip.findMany({
      where,
      include: {
        videoCategory: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });

    return NextResponse.json({ 
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        viewCount: v.viewCount,
        lawNumbers: v.lawNumbers,
        sanctionType: v.sanctionType,
        restartType: v.restartType,
        category: v.videoCategory?.name,
        tags: v.tags.map(t => t.tag.name)
      }))
    });
  } catch (error) {
    console.error('Video search error:', error);
    return NextResponse.json({ error: 'Failed to search videos' }, { status: 500 });
  }
}
