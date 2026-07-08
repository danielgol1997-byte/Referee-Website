/**
 * End-to-end search pipeline test against production data. Mirrors the
 * semantic-search route: enhance → hard filters → query embedding → vector
 * search → tag merge → rerank. Read-only except for nothing — no writes.
 *
 * Usage: npx tsx --env-file=.env.prod.tmp scripts/test-search-e2e.ts "query here" [more queries...]
 */
import { prisma } from "../lib/prisma";
import { enhanceSearchQuery } from "../lib/ai/enhance-search-query";
import { generateEmbedding, searchByEmbedding } from "../lib/ai/embeddings";
import { rerankSearchResults } from "../lib/ai/rerank";

async function runQuery(query: string) {
  console.log(`\n${"=".repeat(70)}\nQUERY: "${query}"\n${"=".repeat(70)}`);
  const t0 = Date.now();

  const enhanced = await enhanceSearchQuery(query);
  console.log(`\n[enhance ${Date.now() - t0}ms]`);
  console.log(`  cleaned:  ${enhanced.cleanedQuery}`);
  console.log(`  expanded: ${enhanced.expandedQuery.slice(0, 140)}...`);
  console.log(
    `  inferredTags: ${enhanced.inferredTags.map((t) => `${t.categorySlug}:${t.tagSlug}(${t.confidence})`).join(", ") || "(none)"}`
  );

  const hardFilterSlugs = enhanced.inferredTags
    .filter((t) => t.confidence === "high")
    .map((t) => t.tagSlug);

  const t1 = Date.now();
  const queryEmbedding = await generateEmbedding(enhanced.expandedQuery, "query");
  let results = await searchByEmbedding(queryEmbedding, {
    limit: 30,
    tagSlugs: hardFilterSlugs,
    keywordBoostTerms: enhanced.keywords,
  });
  let relaxed = false;
  if (results.length === 0 && hardFilterSlugs.length > 0) {
    results = await searchByEmbedding(queryEmbedding, {
      limit: 30,
      tagSlugs: [],
      keywordBoostTerms: enhanced.keywords,
    });
    relaxed = true;
  }
  console.log(`\n[vector ${Date.now() - t1}ms] ${results.length} results (hard filters: ${hardFilterSlugs.join(",") || "none"}${relaxed ? " → relaxed, no exact match" : ""})`);

  const t2 = Date.now();
  const { results: reranked, reranked: ok, scores } = await rerankSearchResults(
    enhanced.cleanedQuery || query,
    results,
    { maxCandidates: 30 }
  );
  console.log(`[rerank ${Date.now() - t2}ms] applied=${ok}`);

  let final = reranked;
  if (ok && scores) {
    const relevant = final.filter((r) => (scores.get(r.id) ?? 0) >= 30);
    if (relevant.length >= 3) final = relevant;
  }

  // Show top 10 with isEducational flag + tags for sanity
  const ids = final.slice(0, 10).map((r) => r.id);
  const details = await prisma.videoClip.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      isEducational: true,
      searchSummary: true,
      tags: { select: { tag: { select: { slug: true, category: { select: { slug: true } } } } } },
    },
  });
  const detailMap = new Map(details.map((d) => [d.id, d]));

  console.log(`\nTOP ${Math.min(10, final.length)} of ${final.length} (total ${Date.now() - t0}ms):`);
  final.slice(0, 10).forEach((r, i) => {
    const d = detailMap.get(r.id);
    const tagStr = d?.tags
      .map((t) => `${t.tag.category?.slug}:${t.tag.slug}`)
      .join(", ");
    console.log(
      `  ${i + 1}. [sim ${r.similarity?.toFixed(3)} | rr ${scores?.get(r.id) ?? "-"}] ${r.title}${d?.isEducational ? " [EDU]" : ""}`
    );
    console.log(`     tags: ${tagStr || "(none)"}`);
    if (d?.searchSummary) console.log(`     ${d.searchSummary.slice(0, 110)}`);
  });
}

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length === 0) {
    queries.push(
      "reckless tackle outside the penalty area",
      "handball red card",
      "penalty yellow card"
    );
  }
  for (const q of queries) {
    await runQuery(q);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
