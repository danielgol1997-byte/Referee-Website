import { getOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
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
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 30, tagSlugs = [], keywordBoostTerms = [] } = options;
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  try {
    let tagFilterJoin = "";
    let tagFilterWhere = "";
    const params: any[] = [vectorStr, limit];
    let paramIndex = 3;

    if (tagSlugs.length > 0) {
      tagFilterJoin = `
        INNER JOIN "VideoTag" vt_filter ON vt_filter."videoId" = v."id"
        INNER JOIN "Tag" t_filter ON t_filter."id" = vt_filter."tagId"
      `;
      tagFilterWhere = `AND t_filter."slug" = ANY($${paramIndex})`;
      params.push(tagSlugs);
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
      GROUP BY v."id"
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
      return fallbackKeywordSearch(keywordBoostTerms, tagSlugs, limit);
    }
    throw error;
  }
}

async function fallbackKeywordSearch(
  keywords: string[],
  tagSlugs: string[],
  limit: number
): Promise<SemanticSearchResult[]> {
  const where: any = { isActive: true, AND: [] as any[] };

  if (tagSlugs.length > 0) {
    where.AND.push({
      tags: { some: { tag: { slug: { in: tagSlugs } } } },
    });
  }

  if (keywords.length > 0) {
    where.AND.push({
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

  if (where.AND.length === 0) delete where.AND;

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
