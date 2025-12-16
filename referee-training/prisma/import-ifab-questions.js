/**
 * Script to import parsed IFAB questions into the database
 * Usage: node prisma/import-ifab-questions.js
 */

const { PrismaClient, QuestionType } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const PARSED_FILE = "prisma/parsed_questions.json";

async function importQuestions() {
  console.log("Starting import...");

  // 1. Check if parsed file exists
  if (!fs.existsSync(PARSED_FILE)) {
    console.error(`Error: File ${PARSED_FILE} not found.`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(PARSED_FILE, "utf8"));
  console.log(`Found ${questions.length} questions to import.`);

  // 2. Find Category
  const categorySlug = "laws-of-the-game";
  let category = await prisma.category.findUnique({
    where: { slug: categorySlug },
  });

  if (!category) {
    console.log(`Category '${categorySlug}' not found. Creating it...`);
    category = await prisma.category.create({
      data: {
        name: "Laws of the Game",
        slug: categorySlug,
        type: "LOTG",
        order: 1,
      },
    });
  }
  console.log(`Using category: ${category.name} (${category.id})`);

  // 3. Import Questions
  let successCount = 0;
  let errorCount = 0;

  for (const [index, q] of questions.entries()) {
    try {
      // Check for duplicates (same text)
      const existing = await prisma.question.findFirst({
        where: {
          text: q.text,
          categoryId: category.id,
        },
      });

      if (existing) {
        console.log(`Skipping duplicate question (Index ${index + 1})`);
        continue;
      }

      await prisma.question.create({
        data: {
          type: QuestionType.LOTG_TEXT,
          categoryId: category.id,
          lawNumbers: q.lawNumbers,
          text: q.text,
          explanation: q.explanation,
          difficulty: 1, // Default difficulty
          answerOptions: {
            create: q.answerOptions.map((opt, idx) => ({
              label: opt.label,
              code: `OPT_${idx}`,
              isCorrect: opt.isCorrect,
              order: idx,
            })),
          },
        },
      });

      successCount++;
      if (successCount % 10 === 0) {
        process.stdout.write(".");
      }
    } catch (err) {
      console.error(`\nFailed to import question ${index + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log("\n\nImport complete!");
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Failed/Skipped: ${errorCount}`);
  console.log(`Total processed: ${questions.length}`);
}

importQuestions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
