import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enhanceSearchQuery } from "@/lib/ai/enhance-search-query";
import {
  generateEmbedding,
  searchByEmbedding,
  hasVectorSupport,
} from "@/lib/ai/embeddings";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, tagFilters } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Step 1: Enhance the user's query with AI
    let enhanced;
    try {
      enhanced = await enhanceSearchQuery(query.trim());
    } catch (error) {
      console.error("Query enhancement failed, using raw query:", error);
      enhanced = {
        cleanedQuery: query.trim(),
        expandedQuery: query.trim(),
        detectedLanguage: "en" as const,
        keywords: query.trim().split(/\s+/),
        inferredTags: [],
      };
    }

    // Step 2: Merge user-selected tags with AI-inferred high-confidence tags
    const userTagSlugs: string[] = Array.isArray(tagFilters) ? tagFilters : [];
    const highConfidenceTags = enhanced.inferredTags.filter(
      (t) => t.confidence === "high"
    );
    const mediumConfidenceTags = enhanced.inferredTags.filter(
      (t) => t.confidence === "medium"
    );

    const hardFilterSlugs = [
      ...new Set([
        ...userTagSlugs,
        ...highConfidenceTags.map((t) => t.tagSlug),
      ]),
    ];
    const boostSlugs = mediumConfidenceTags.map((t) => t.tagSlug);

    // Step 3: Try semantic search, then supplement with tag-based results
    const vectorSupport = await hasVectorSupport();
    let results: Awaited<ReturnType<typeof keywordFallbackSearch>> | null = null;

    if (vectorSupport) {
      try {
        const queryEmbedding = await generateEmbedding(enhanced.expandedQuery);
        results = await searchByEmbedding(queryEmbedding, {
          limit: 30,
          tagSlugs: hardFilterSlugs,
          boostTagSlugs: boostSlugs,
          keywordBoostTerms: enhanced.keywords,
        });
      } catch (error) {
        console.error("Semantic search failed, falling back:", error);
        results = null;
      }
    }

    // When hard tag filters are present, ALWAYS run the tag-based query as well.
    // The vector search only finds videos that already have a stored embedding —
    // most tagged videos won't have one yet. Merging the two ensures all tagged
    // videos appear; vector-matched ones float to the top via their similarity
    // score, the rest are appended ordered by featured/viewCount.
    if (hardFilterSlugs.length > 0) {
      const tagResults = await keywordFallbackSearch(
        enhanced.keywords,
        enhanced.cleanedQuery,
        hardFilterSlugs,
        50
      );
      if (results && results.length > 0) {
        const vectorIds = new Set(results.map((r) => r.id));
        const extras = tagResults.filter((r) => !vectorIds.has(r.id));
        results = [...results, ...extras];
      } else {
        results = tagResults;
      }
    }

    // Pure text/semantic fallback when no tags were inferred at all.
    if (!results || results.length === 0) {
      results = await keywordFallbackSearch(
        enhanced.keywords,
        enhanced.cleanedQuery,
        hardFilterSlugs,
        30
      );
    }

    // Enrich results with tag data for the UI
    const videoIds = results.map((r) => r.id);
    const videosWithTags = await prisma.videoClip.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        fileUrl: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                slug: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    canBeCorrectAnswer: true,
                  },
                },
              },
            },
            isCorrectDecision: true,
            decisionOrder: true,
          },
        },
      },
    });

    const tagMap = new Map(videosWithTags.map((v) => [v.id, v]));

    const enrichedResults = results.map((r) => {
      const videoData = tagMap.get(r.id);
      return {
        ...r,
        fileUrl: videoData?.fileUrl || "",
        tags: videoData?.tags.map((vt) => ({
          id: vt.tag.id,
          slug: vt.tag.slug,
          name: vt.tag.name,
          category: vt.tag.category,
          isCorrectDecision: vt.isCorrectDecision,
          decisionOrder: vt.decisionOrder,
        })) || [],
      };
    });

    return NextResponse.json({
      results: enrichedResults,
      query: {
        original: query,
        cleaned: enhanced.cleanedQuery,
        expanded: enhanced.expandedQuery,
        language: enhanced.detectedLanguage,
        inferredTags: enhanced.inferredTags,
      },
      meta: {
        totalResults: enrichedResults.length,
        searchMethod: vectorSupport ? "semantic" : "keyword",
      },
    });
  } catch (error: any) {
    console.error("Semantic search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

async function keywordFallbackSearch(
  keywords: string[],
  cleanedQuery: string,
  tagSlugs: string[],
  limit: number
) {
  const andFilters: any[] = [];

  // Tag filters are always hard constraints — each slug must be present.
  for (const slug of tagSlugs) {
    andFilters.push({ tags: { some: { tag: { slug } } } });
  }

  // Text matching is only a hard constraint when no tags were specified.
  // When tags already narrow the result set, text is used for ordering only
  // (via the orderBy below) so we don't accidentally hide tagged videos that
  // don't happen to mention the search term in their title/description.
  if (tagSlugs.length === 0) {
    const textConditions = [cleanedQuery, ...keywords].filter(Boolean);
    if (textConditions.length > 0) {
      andFilters.push({
        OR: [
          ...textConditions.map((term) => ({
            canonicalSearchText: { contains: term, mode: "insensitive" as const },
          })),
          ...textConditions.map((term) => ({
            title: { contains: term, mode: "insensitive" as const },
          })),
          ...textConditions.map((term) => ({
            description: { contains: term, mode: "insensitive" as const },
          })),
          ...textConditions.map((term) => ({
            searchSummary: { contains: term, mode: "insensitive" as const },
          })),
        ],
      });
    }
  }

  const where: any = { isActive: true };
  if (andFilters.length > 0) where.AND = andFilters;

  const videos = await prisma.videoClip.findMany({
    where,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      duration: true,
      viewCount: true,
      lawNumbers: true,
      sanctionType: true,
      restartType: true,
      isFeatured: true,
    },
    orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }],
    take: limit,
  });

  return videos.map((v, i) => ({
    ...v,
    similarity: 1 - i * 0.01,
  }));
}
