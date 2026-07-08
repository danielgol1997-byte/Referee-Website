/**
 * One-off migration: regenerate ALL stored video embeddings with the Gemini
 * embedding model (the search stack moved off OpenAI). Query vectors and
 * stored vectors must come from the same model, so every indexed video is
 * re-embedded from its canonicalSearchText.
 *
 * Touches ONLY the embedding column — tags, slugs, descriptions untouched.
 *
 * Usage: npx tsx --env-file=.env.prod.tmp scripts/reembed-videos.ts
 */
import { prisma } from "../lib/prisma";
import { storeVideoEmbedding } from "../lib/ai/embeddings";

async function main() {
  const videos = await prisma.videoClip.findMany({
    where: {
      canonicalSearchText: { not: null },
      searchDescriptionStatus: "approved",
    },
    select: { id: true, title: true, canonicalSearchText: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Re-embedding ${videos.length} video(s) with Gemini...\n`);
  let ok = 0;
  let failed = 0;

  for (const [i, v] of videos.entries()) {
    try {
      await storeVideoEmbedding(v.id, v.canonicalSearchText!);
      ok++;
      if ((i + 1) % 25 === 0 || i === videos.length - 1) {
        console.log(`  ${i + 1}/${videos.length} done`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  ✗ ${v.title}: ${err?.message}`);
      // Simple backoff on rate limits
      if (String(err?.message).includes("429")) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
