// Sync answers from local to production by matching question text
// Usage: DATABASE_URL="<prod-url>" node prisma/sync-answers-by-text.js /tmp/production_answers_export.json

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

async function main() {
  const localAnswersFile = process.argv[2];
  if (!localAnswersFile) {
    console.error("Usage: DATABASE_URL=<prod-url> node prisma/sync-answers-by-text.js <local-answers-file.json>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  
  console.log("Step 1: Loading local answers from file...");
  const localAnswers = JSON.parse(fs.readFileSync(localAnswersFile, "utf-8"));
  console.log(`Loaded ${localAnswers.length} questions with answers from local export`);
  console.log("");

  console.log("Step 2: Fetching all production LOTG questions...");
  const prodQuestions = await prisma.question.findMany({
    where: { type: 'LOTG_TEXT' },
    select: {
      id: true,
      text: true,
      explanation: true,
      answerOptions: {
        select: { id: true, label: true, isCorrect: true },
        orderBy: { order: 'asc' }
      }
    }
  });
  console.log(`Found ${prodQuestions.length} LOTG questions in production`);
  console.log("");

  // Build a map of production questions by text for fast lookup
  const prodQuestionsByText = new Map();
  for (const q of prodQuestions) {
    const key = q.text.trim().toLowerCase();
    prodQuestionsByText.set(key, q);
  }

  console.log("Step 3: Fetching local questions to build text mapping...");
  // We need to connect to local DB to get question text
  // Create a second client for local DB
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://referee_admin:referee_password@localhost:5434/referee_training"
      }
    }
  });
  
  const localQuestions = await localPrisma.question.findMany({
    where: { type: 'LOTG_TEXT' },
    select: { id: true, text: true }
  });
  
  const localTextById = new Map();
  for (const q of localQuestions) {
    localTextById.set(q.id, q.text.trim().toLowerCase());
  }
  
  await localPrisma.$disconnect();
  console.log(`Loaded ${localQuestions.length} questions from local DB`);
  console.log("");

  console.log("Step 4: Matching and applying answers...");
  console.log("");

  let matched = 0;
  let notMatched = 0;
  let applied = 0;
  let errors = 0;

  for (const localEntry of localAnswers) {
    const { questionId: localQuestionId, options } = localEntry;
    
    // Get the local question text
    const localText = localTextById.get(localQuestionId);
    if (!localText) {
      console.log(`SKIP: Local question ${localQuestionId} not found in local DB`);
      notMatched++;
      continue;
    }

    // Find matching production question
    const prodQuestion = prodQuestionsByText.get(localText);
    if (!prodQuestion) {
      console.log(`NO MATCH: Cannot find production question matching: ${localText.substring(0, 60)}...`);
      notMatched++;
      continue;
    }

    matched++;
    
    // Check if answers are already the same
    if (prodQuestion.answerOptions.length === 4) {
      const allMatch = prodQuestion.answerOptions.every((prodOpt, idx) => {
        return prodOpt.label === options[idx]?.label && 
               prodOpt.isCorrect === options[idx]?.isCorrect;
      });
      
      if (allMatch) {
        // Skip if answers are already identical
        continue;
      }
    }

    // Apply the new answers
    try {
      await prisma.$transaction(async (tx) => {
        await tx.answerOption.deleteMany({ where: { questionId: prodQuestion.id } });
        await tx.question.update({
          where: { id: prodQuestion.id },
          data: {
            answerOptions: {
              create: options.map((opt, idx) => ({
                label: opt.label,
                code: `OPT_${idx}`,
                isCorrect: opt.isCorrect,
                order: idx,
              })),
            },
          },
        });
      });
      applied++;
      if (applied % 50 === 0) {
        console.log(`Progress: ${applied} applied, ${matched} matched, ${notMatched} not matched...`);
      }
    } catch (err) {
      console.error(`ERROR updating ${prodQuestion.id}: ${err.message}`);
      errors++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`FINAL RESULTS:`);
  console.log(`  Matched: ${matched}/${localAnswers.length}`);
  console.log(`  Applied: ${applied}`);
  console.log(`  Not Matched: ${notMatched}`);
  console.log(`  Errors: ${errors}`);
  console.log("=".repeat(60));
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
