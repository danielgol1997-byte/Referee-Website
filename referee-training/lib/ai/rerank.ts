import { prisma } from "@/lib/prisma";
import { geminiGenerateJson } from "@/lib/gemini";

const RERANK_SYSTEM_PROMPT = `You are a relevance reranker for a football referee training video library.

You are given a user's search query and a numbered list of candidate videos (title + summary + decision metadata). Score how relevant each candidate is to the query on a 0-100 scale:
- 90-100: directly answers the query (incident type, location, sanction, restart all match what was asked)
- 60-89: strongly related (same incident type but some queried detail differs or is unknown)
- 30-59: partially related (shares the general theme but misses the key thing the user asked for)
- 0-29: unrelated or contradicts an explicit part of the query

Rules:
- Judge ONLY against what the user actually asked. Do not reward videos for being interesting.
- LOCATION is a hard requirement when the query names one (e.g. "in the penalty area", "outside the box"):
  • A candidate that states or implies the OPPOSITE location must score 15 or below.
  • A candidate that never indicates the queried location must score 55 or below.
  • Use the restart as a location signal: restart "penalty kick" means the offence was INSIDE the penalty area; restart "direct free kick" means it was OUTSIDE the penalty area.
- The same hard treatment applies to an explicitly queried sanction (card) or restart: contradiction → below 20; unknown → cap at 55.
- If a candidate's summary doesn't mention a queried detail either way, treat it as unknown, not contradicting.
- Score every candidate. Output strict JSON: {"scores": [{"index": 1, "score": 87}, ...]} with one entry per candidate.`;

export interface RerankedResult<T> {
  item: T;
  rerankScore: number;
}

/**
 * Rerank search candidates against the user's query with a fast Gemini call.
 * Falls back to the original ordering when the model call fails — reranking
 * must never break search.
 */
export async function rerankSearchResults<T extends { id: string; title: string; similarity?: number }>(
  query: string,
  candidates: T[],
  options: { maxCandidates?: number } = {}
): Promise<{ results: T[]; reranked: boolean; scores?: Map<string, number> }> {
  const maxCandidates = options.maxCandidates ?? 30;
  if (candidates.length < 2) return { results: candidates, reranked: false };

  const head = candidates.slice(0, maxCandidates);
  const tail = candidates.slice(maxCandidates);

  try {
    // Pull summaries + decision tags for the head candidates. The restart and
    // sanction tags double as location signals (penalty kick = inside the
    // box, direct free kick = outside), which summaries don't always state.
    const summaries = await prisma.videoClip.findMany({
      where: { id: { in: head.map((c) => c.id) } },
      select: {
        id: true,
        searchSummary: true,
        tags: {
          select: {
            tag: {
              select: { name: true, category: { select: { slug: true } } },
            },
          },
        },
      },
    });
    const detailMap = new Map(
      summaries.map((s) => {
        const restart = s.tags.find((t) => t.tag.category?.slug === "restarts")?.tag.name;
        const sanction = s.tags.find((t) => t.tag.category?.slug === "sanction")?.tag.name;
        return [s.id, { summary: s.searchSummary || "", restart, sanction }];
      })
    );

    const lines = head.map((c, i) => {
      const d = detailMap.get(c.id);
      const meta: string[] = [];
      if (d?.restart) meta.push(`restart: ${d.restart}`);
      if (d?.sanction) meta.push(`sanction: ${d.sanction}`);
      const metaStr = meta.length > 0 ? ` [${meta.join(", ")}]` : "";
      return `${i + 1}. ${c.title}${d?.summary ? ` — ${d.summary}` : ""}${metaStr}`;
    });

    const userMessage = `SEARCH QUERY: ${query}\n\nCANDIDATES:\n${lines.join("\n")}`;

    const { parsed } = await geminiGenerateJson({
      systemInstruction: RERANK_SYSTEM_PROMPT,
      messages: [{ role: "user", text: userMessage }],
      temperature: 0,
      maxOutputTokens: 4096,
    });

    const rawScores: Array<{ index: number; score: number }> = Array.isArray(parsed?.scores)
      ? parsed.scores
      : [];
    if (rawScores.length === 0) return { results: candidates, reranked: false };

    const scoreByIndex = new Map<number, number>();
    for (const s of rawScores) {
      if (typeof s?.index === "number" && typeof s?.score === "number") {
        scoreByIndex.set(s.index, Math.max(0, Math.min(100, s.score)));
      }
    }

    const scored = head.map((item, i) => ({
      item,
      rerankScore: scoreByIndex.get(i + 1) ?? 0,
      originalIndex: i,
    }));

    // Stable sort: rerank score first, embedding order as tie-breaker.
    scored.sort((a, b) =>
      b.rerankScore !== a.rerankScore
        ? b.rerankScore - a.rerankScore
        : a.originalIndex - b.originalIndex
    );

    const scoreById = new Map(scored.map((s) => [s.item.id, s.rerankScore]));
    return {
      results: [...scored.map((s) => s.item), ...tail],
      reranked: true,
      scores: scoreById,
    };
  } catch (error) {
    console.warn(
      "Reranking failed, keeping embedding order:",
      error instanceof Error ? error.message : error
    );
    return { results: candidates, reranked: false };
  }
}
