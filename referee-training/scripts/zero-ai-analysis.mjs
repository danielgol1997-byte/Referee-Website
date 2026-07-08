/**
 * One-off maintenance script: resets ("zeroes") the AI search-description
 * data on analyzed videos so they can be re-analyzed fresh by the new
 * pipeline. Touches ONLY AI fields — tags, slugs, and all other video data
 * remain untouched.
 *
 * Usage:
 *   node --env-file=.env.prod.tmp scripts/zero-ai-analysis.mjs          # dry run (list only)
 *   node --env-file=.env.prod.tmp scripts/zero-ai-analysis.mjs --apply  # actually zero
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

// Same markers as lib/ai/analyze-pipeline.ts — keep only the admin's own
// text that precedes any AI-appended block.
const AI_MARKERS = ["=== AI VIDEO ANALYSIS", "=== IMPORTANT: ON-FIELD DECISION"];
function stripAiBlocks(raw) {
  if (!raw) return null;
  let cut = raw.length;
  for (const m of AI_MARKERS) {
    const idx = raw.indexOf(m);
    if (idx !== -1 && idx < cut) cut = idx;
  }
  const kept = raw.slice(0, cut).trim();
  return kept.length > 0 ? kept : null;
}

async function main() {
  const analyzed = await prisma.videoClip.findMany({
    where: {
      OR: [
        { searchDescriptionStatus: { not: "none" } },
        { canonicalSearchText: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      searchDescriptionStatus: true,
      rawAdminDescription: true,
      canonicalSearchText: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${analyzed.length} video(s) with AI search data:\n`);
  for (const v of analyzed) {
    const hasAiBlock = AI_MARKERS.some((m) => (v.rawAdminDescription || "").includes(m));
    console.log(
      `- [${v.searchDescriptionStatus}] ${v.title}` +
        ` (canonical: ${v.canonicalSearchText ? v.canonicalSearchText.length + " chars" : "none"}` +
        `${hasAiBlock ? ", raw has AI blocks" : ""})`
    );
  }

  if (!apply) {
    console.log("\nDry run — nothing changed. Re-run with --apply to zero these.");
    return;
  }

  console.log("\nZeroing AI fields (tags and all other data untouched)...");
  for (const v of analyzed) {
    await prisma.videoClip.update({
      where: { id: v.id },
      data: {
        rawAdminDescription: stripAiBlocks(v.rawAdminDescription),
        canonicalSearchText: null,
        searchSummary: null,
        searchKeywords: [],
        searchDescriptionStatus: "none",
        searchDescriptionLang: null,
        aiProcessedAt: null,
        aiProcessedById: null,
      },
    });
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "VideoClip" SET "embedding" = NULL WHERE "id" = $1`,
        v.id
      );
    } catch (err) {
      console.warn(`  (embedding column skip for ${v.id}: ${err.message?.split("\n")[0]})`);
    }
    console.log(`  ✓ zeroed: ${v.title}`);
  }
  console.log(`\nDone — ${analyzed.length} video(s) reset to "none". Tags untouched.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
