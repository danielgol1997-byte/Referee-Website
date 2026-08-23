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
 * - Idempotent: updates questions copied by source id, with a text fallback for
 *   rows created by older versions of this script.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

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

function databaseIdentity(urlString, envName) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`${envName} must be a valid database URL.`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!["postgres:", "postgresql:"].includes(protocol)) {
    throw new Error(`${envName} must be a PostgreSQL URL.`);
  }

  const port = parsed.port || "5432";
  return [
    protocol === "postgres:" ? "postgresql:" : protocol,
    parsed.hostname.toLowerCase(),
    port,
    parsed.pathname.replace(/\/+$/, ""),
  ].join("|");
}

function assertDistinctDatabases(localUrl, prodUrl) {
  if (databaseIdentity(localUrl, "DATABASE_URL") === databaseIdentity(prodUrl, "PROD_DATABASE_URL")) {
    throw new Error("DATABASE_URL and PROD_DATABASE_URL point at the same database.");
  }
}

function sortedAnswerOptions(answerOptions) {
  return [...(answerOptions || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((opt, idx) => ({
      label: opt.label,
      code: opt.code || `OPT_${idx}`,
      isCorrect: !!opt.isCorrect,
      order: opt.order ?? idx,
    }));
}

function questionLabel(question) {
  return `${question.id || "unknown id"} "${String(question.text || "").slice(0, 80)}"`;
}

function validateLotgQuestion(question) {
  if (!question.text || !String(question.text).trim()) {
    throw new Error(`Local LOTG question ${question.id || "unknown id"} has blank text.`);
  }

  const answerOptions = sortedAnswerOptions(question.answerOptions);
  if (answerOptions.length === 0) {
    throw new Error(`Local LOTG question ${questionLabel(question)} has no answer options.`);
  }

  const correctCount = answerOptions.filter((opt) => opt.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error(
      `Local LOTG question ${questionLabel(question)} must have exactly one correct answer option; found ${correctCount}.`
    );
  }

  return answerOptions;
}

function questionData(question, prodLotgCategoryId) {
  return {
    type: QuestionType.LOTG_TEXT,
    categoryId: prodLotgCategoryId,
    text: question.text,
    explanation: question.explanation,
    difficulty: question.difficulty ?? 1,
    isActive: question.isActive ?? true,
    isVar: question.isVar ?? false,
    lawNumbers: Array.isArray(question.lawNumbers) ? question.lawNumbers : [],
  };
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
  assertDistinctDatabases(localUrl, prodUrl);

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
    if (totalLocal === 0) {
      throw new Error("Local DB has zero LOTG questions to copy.");
    }

    console.log(`[COPY] Local LOTG questions: ${totalLocal}`);
    console.log(`[COPY] Copying into prod categoryId=${prodLotgCategory.id}`);

    const batchSize = 50;
    let imported = 0;
    let updated = 0;

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
        const answerOptions = validateLotgQuestion(q);
        const action = await upsertQuestion(prod, prodLotgCategory.id, q, answerOptions);
        if (action === "created") imported++;
        if (action === "updated") updated++;
      }

      console.log(
        `[COPY] Progress: imported=${imported}, updated=${updated}, processed=${imported + updated}/${totalLocal}`
      );
    }

    console.log(`[COPY] Done. imported=${imported}, updated=${updated}`);
  } finally {
    await Promise.allSettled([local.$disconnect(), prod.$disconnect()]);
  }
}

async function upsertQuestion(prod, prodLotgCategoryId, question, answerOptions) {
  return prod.$transaction(async (tx) => {
    const existingById = await tx.question.findUnique({
      where: { id: question.id },
      include: { answerOptions: true },
    });
    if (
      existingById &&
      (existingById.categoryId !== prodLotgCategoryId || existingById.type !== QuestionType.LOTG_TEXT)
    ) {
      throw new Error(
        `Question id ${question.id} already exists in prod but is not a LOTG question in the target category.`
      );
    }

    const existingByText = existingById
      ? null
      : await tx.question.findFirst({
          where: {
            categoryId: prodLotgCategoryId,
            text: question.text,
            type: QuestionType.LOTG_TEXT,
          },
          include: { answerOptions: true },
        });

    const existing = existingById || existingByText;

    if (!existing) {
      await tx.question.create({
        data: {
          id: question.id,
          ...questionData(question, prodLotgCategoryId),
          answerOptions: { create: answerOptions },
        },
      });
      return "created";
    }

    await tx.question.update({
      where: { id: existing.id },
      data: questionData(question, prodLotgCategoryId),
    });

    const existingByCode = new Map(existing.answerOptions.map((opt) => [opt.code, opt]));
    const desiredCodes = new Set(answerOptions.map((opt) => opt.code));

    for (const option of answerOptions) {
      const existingOption = existingByCode.get(option.code);
      if (existingOption) {
        await tx.answerOption.update({
          where: { id: existingOption.id },
          data: option,
        });
      } else {
        await tx.answerOption.create({
          data: {
            ...option,
            questionId: existing.id,
          },
        });
      }
    }

    const staleOptions = existing.answerOptions.filter((opt) => !desiredCodes.has(opt.code));
    if (staleOptions.length > 0) {
      const staleOptionIds = staleOptions.map((opt) => opt.id);
      const historicalAnswers = await tx.testAnswer.count({
        where: { selectedOptionId: { in: staleOptionIds } },
      });

      if (historicalAnswers > 0) {
        throw new Error(
          `Question ${questionLabel(question)} has removed answer options that are referenced by historical test answers.`
        );
      }

      await tx.answerOption.deleteMany({
        where: { id: { in: staleOptionIds } },
      });
    }

    return "updated";
  });
}

if (require.main === module) {
  main().catch((e) => {
    console.error("[COPY] Failed:", e?.message || e);
    process.exit(1);
  });
}

module.exports = {
  assertDistinctDatabases,
  databaseIdentity,
  questionData,
  sortedAnswerOptions,
  validateLotgQuestion,
};

