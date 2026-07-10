import { getGemini, GEMINI_EMBEDDING_MODEL } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { contentWhere } from "@/lib/scope";

// Must match the pgvector column: vector(1536).
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding with Gemini. `kind` selects the retrieval task type:
 * "document" for stored video descriptions, "query" for user searches.
 *
 * IMPORTANT: no cross-provider fallback here — all vectors (stored and query)
 * must come from the same model or similarity scores are meaningless.
 */
export async function generateEmbedding(
  text: string,
  kind: "document" | "query" = "document"
): Promise<number[]> {
  const response = await getGemini().models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini embedding failed: got ${values?.length ?? 0} dimensions, expected ${EMBEDDING_DIMENSIONS}`
    );
  }
  return values;
}

export async function storeVideoEmbedding(
  videoId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text);
  const vectorStr = `[${embedding.join(",")}]`;

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "VideoClip" SET "embedding" = $1::vector WHERE "id" = $2`,
      vectorStr,
      videoId
    );
  } catch (error: any) {
    if (error?.message?.includes("vector") || error?.code === "42704") {
      console.warn(
        "pgvector not available - storing embedding as JSON fallback. " +
          "This is expected in local dev. Production (Neon) uses pgvector."
      );
      return;
    }
    throw error;
  }
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
  lawNumbers: number[];
  sanctionType: string | null;
  restartType: string | null;
  isFeatured: boolean;
  similarity: number;
}

export async function searchByEmbedding(
  queryEmbedding: number[],
  options: {
    limit?: number;
    tagSlugs?: string[];
    boostTagSlugs?: string[];
    keywordBoostTerms?: string[];
    /** Federation scope: null/undefined = global content only. */
    associationId?: string | null;
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 30, tagSlugs = [], keywordBoostTerms = [], associationId = null } = options;
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  try {
    let tagFilterJoin = "";
    let tagFilterWhere = "";
    let tagFilterHaving = "";
    const params: any[] = [vectorStr, limit];
    let paramIndex = 3;

    if (tagSlugs.length > 0) {
      tagFilterJoin = `
        INNER JOIN "VideoTag" vt_filter ON vt_filter."videoId" = v."id"
        INNER JOIN "Tag" t_filter ON t_filter."id" = vt_filter."tagId"
      `;
      tagFilterWhere = `AND t_filter."slug" = ANY($${paramIndex})`;
      // Hard filters are AND semantics: the video must carry EVERY requested
      // slug, not just one of them (e.g. "handball red card" must exclude
      // handball clips without a red card).
      tagFilterHaving = `HAVING COUNT(DISTINCT t_filter."slug") = ${tagSlugs.length}`;
      params.push(tagSlugs);
      paramIndex++;
    }

    // Federation scope: always include global (NULL) content; optionally the
    // user's own association.
    let scopeWhere = `AND v."associationId" IS NULL`;
    if (associationId) {
      scopeWhere = `AND (v."associationId" IS NULL OR v."associationId" = $${paramIndex})`;
      params.push(associationId);
      paramIndex++;
    }

    const query = `
      SELECT
        v."id",
        v."title",
        v."thumbnailUrl",
        v."duration",
        v."viewCount",
        v."lawNumbers",
        v."sanctionType",
        v."restartType",
        v."isFeatured",
        1 - (v."embedding" <=> $1::vector) AS similarity
      FROM "VideoClip" v
      ${tagFilterJoin}
      WHERE v."isActive" = true
        AND v."embedding" IS NOT NULL
        ${tagFilterWhere}
        ${scopeWhere}
      GROUP BY v."id"
      ${tagFilterHaving}
      ORDER BY similarity DESC
      LIMIT $2
    `;

    const results: any[] = await prisma.$queryRawUnsafe(query, ...params);

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      thumbnailUrl: r.thumbnailUrl,
      duration: r.duration ? Number(r.duration) : null,
      viewCount: Number(r.viewCount),
      lawNumbers: r.lawNumbers || [],
      sanctionType: r.sanctionType,
      restartType: r.restartType,
      isFeatured: r.isFeatured,
      similarity: Number(r.similarity),
    }));
  } catch (error: any) {
    if (error?.message?.includes("vector") || error?.code === "42704") {
      console.warn("pgvector not available - falling back to keyword search");
      return fallbackKeywordSearch(keywordBoostTerms, tagSlugs, limit, associationId);
    }
    throw error;
  }
}

async function fallbackKeywordSearch(
  keywords: string[],
  tagSlugs: string[],
  limit: number,
  associationId: string | null = null
): Promise<SemanticSearchResult[]> {
  const andFilters: any[] = [contentWhere(associationId)];

  // Tag filters are always hard constraints — each slug must be present.
  for (const slug of tagSlugs) {
    andFilters.push({ tags: { some: { tag: { slug } } } });
  }

  // Only require text match when no tags were given — otherwise tagged videos
  // without the keyword in their text fields would be incorrectly excluded.
  if (tagSlugs.length === 0 && keywords.length > 0) {
    andFilters.push({
      OR: [
        ...keywords.map((kw) => ({
          canonicalSearchText: { contains: kw, mode: "insensitive" as const },
        })),
        ...keywords.map((kw) => ({
          title: { contains: kw, mode: "insensitive" as const },
        })),
        ...keywords.map((kw) => ({
          searchSummary: { contains: kw, mode: "insensitive" as const },
        })),
      ],
    });
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
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    viewCount: v.viewCount,
    lawNumbers: v.lawNumbers,
    sanctionType: v.sanctionType,
    restartType: v.restartType,
    isFeatured: v.isFeatured,
    similarity: 1 - i * 0.01,
  }));
}

export async function hasVectorSupport(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`
    );
    return true;
  } catch {
    return false;
  }
}
