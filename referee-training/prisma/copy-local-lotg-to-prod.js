/**
 * Copy the local LOTG question bank into a production database.
 *
 * Why this exists:
 * - The repo only contains a small parsed question sample.
 * - Your local dev DB has ~555 LOTG questions that aren't in git.
 *
 * Usage (run from referee-training/):
 *   PROD_DATABASE_URL="postgresql://.../db?sslmode=require" node prisma/copy-local-lotg-to-prod.js
 *
 * Notes:
 * - Reads local DB from DATABASE_URL (your current .env / env).
 * - Writes to prod DB via PROD_DATABASE_URL (direct/non-pooled recommended).
 * - Idempotent-ish: skips questions that already exist (same text in LOTG category).
 */
/* eslint-disable no-console */

const { PrismaClient, QuestionType, CategoryType } = require("@prisma/client");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function createClient(url) {
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

async function ensureLotgCategory(prisma) {
  const slug = "laws-of-the-game";
  let category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Laws of the Game",
        slug,
        type: CategoryType.LOTG,
        order: 1,
      },
    });
  }
  return category;
}

async function main() {
  const localUrl = requireEnv("DATABASE_URL");
  const prodUrl = requireEnv("PROD_DATABASE_URL");

  const local = createClient(localUrl);
  const prod = createClient(prodUrl);

  try {
    const localLotgCategory = await local.category.findUnique({
      where: { slug: "laws-of-the-game" },
      select: { id: true },
    });
    if (!localLotgCategory) {
      throw new Error("Local DB missing category slug 'laws-of-the-game'.");
    }

    const prodLotgCategory = await ensureLotgCategory(prod);

    const totalLocal = await local.question.count({
      where: { type: QuestionType.LOTG_TEXT, categoryId: localLotgCategory.id },
    });

    console.log(`[COPY] Local LOTG questions: ${totalLocal}`);
    console.log(`[COPY] Copying into prod categoryId=${prodLotgCategory.id}`);

    const batchSize = 50;
    let imported = 0;
    let skipped = 0;

    // Deterministic pagination
    let cursor = undefined;
    while (true) {
      const rows = await local.question.findMany({
        where: { type: QuestionType.LOTG_TEXT, categoryId: localLotgCategory.id },
        include: { answerOptions: true },
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      for (const q of rows) {
        // Skip duplicates by (category + exact text)
        const exists = await prod.question.findFirst({
          where: { categoryId: prodLotgCategory.id, text: q.text, type: QuestionType.LOTG_TEXT },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }

        await prod.question.create({
          data: {
            type: QuestionType.LOTG_TEXT,
            categoryId: prodLotgCategory.id,
            text: q.text,
            explanation: q.explanation,
            difficulty: q.difficulty ?? 1,
            isActive: q.isActive ?? true,
            isVar: q.isVar ?? false,
            lawNumbers: Array.isArray(q.lawNumbers) ? q.lawNumbers : [],
            answerOptions: {
              create: (q.answerOptions || [])
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((opt, idx) => ({
                  label: opt.label,
                  code: opt.code || `OPT_${idx}`,
                  isCorrect: !!opt.isCorrect,
                  order: opt.order ?? idx,
                })),
            },
          },
        });

        imported++;
      }

      console.log(
        `[COPY] Progress: imported=${imported}, skipped=${skipped}, processed=${imported + skipped}/${totalLocal}`
      );
    }

    console.log(`[COPY] Done. imported=${imported}, skipped=${skipped}`);
  } finally {
    await Promise.allSettled([local.$disconnect(), prod.$disconnect()]);
  }
}

main().catch((e) => {
  console.error("[COPY] Failed:", e?.message || e);
  process.exit(1);
});

