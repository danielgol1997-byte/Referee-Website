/**
 * One-off recovery: videos whose Gemini video analysis succeeded but whose
 * description generation failed (OpenAI quota) were left in "draft" with the
 * analysis facts already stored in rawAdminDescription. This script re-runs
 * ONLY the generation + approve + embed steps (no video re-watch needed).
 *
 * Touches ONLY AI search fields — tags, slugs, and all other data untouched.
 *
 * Usage: npx tsx --env-file=.env.prod.tmp scripts/finish-draft-descriptions.ts
 */
import { prisma } from "../lib/prisma";
import { generateSearchDescription } from "../lib/ai/generate-search-description";
import { storeVideoEmbedding } from "../lib/ai/embeddings";

async function main() {
  const drafts = await prisma.videoClip.findMany({
    where: {
      searchDescriptionStatus: { in: ["draft", "failed", "analyzing", "none"] },
      isActive: true,
      rawAdminDescription: { contains: "=== AI VIDEO ANALYSIS" },
    },
    select: {
      id: true,
      title: true,
      description: true,
      decisionExplanation: true,
      isEducational: true,
      restartType: true,
      sanctionType: true,
      offsideReason: true,
      playOn: true,
      noOffence: true,
      varRelevant: true,
      lawNumbers: true,
      rawAdminDescription: true,
      searchDescriptionStatus: true,
      tags: {
        select: {
          isCorrectDecision: true,
          tag: {
            select: {
              name: true,
              slug: true,
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${drafts.length} video(s) with stored analysis but no approved description.\n`);

  let ok = 0;
  let failed = 0;
  for (const video of drafts) {
    process.stdout.write(`- [${video.searchDescriptionStatus}] ${video.title} ... `);
    try {
      const metadata = {
        title: video.title,
        description: video.description,
        decisionExplanation: video.decisionExplanation,
        isEducational: video.isEducational,
        restartType: video.restartType,
        sanctionType: video.sanctionType,
        offsideReason: video.offsideReason,
        playOn: video.playOn,
        noOffence: video.noOffence,
        varRelevant: video.varRelevant,
        lawNumbers: video.lawNumbers,
        tags: video.tags.map((vt) => ({
          name: vt.tag.name,
          slug: vt.tag.slug,
          categoryName: vt.tag.category?.name || "Unknown",
          categorySlug: vt.tag.category?.slug || "unknown",
          isCorrectDecision: vt.isCorrectDecision,
        })),
      };

      const generation = await generateSearchDescription(
        metadata,
        video.rawAdminDescription || ""
      );

      await prisma.videoClip.update({
        where: { id: video.id },
        data: {
          canonicalSearchText: generation.canonicalDescription,
          searchSummary: generation.searchSummary,
          searchKeywords: generation.searchKeywords,
          searchDescriptionStatus: "approved",
          searchDescriptionLang: "en",
          aiProcessedAt: new Date(),
        },
      });
      // NOTE: suggestedTags are intentionally NOT applied here — this recovery
      // script never touches tags.

      await storeVideoEmbedding(
        video.id,
        generation.embeddingText || generation.canonicalDescription
      );

      ok++;
      console.log("✓ approved + embedded");
    } catch (err: any) {
      failed++;
      console.log(`✗ ${err?.message}`);
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
