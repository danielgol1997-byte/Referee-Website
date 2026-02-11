// Apply rebalanced answers to production database
// Usage: DATABASE_URL="<prod-url>" node prisma/apply-answers-production.js /tmp/production_answers_export.json

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: DATABASE_URL=<prod-url> node prisma/apply-answers-production.js <answers-file.json>");
    process.exit(1);
  }

  // Ensure we have a DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Show which database we're connecting to (masked)
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
  console.log("Connecting to:", maskedUrl);
  console.log("");

  const prisma = new PrismaClient();
  const answers = JSON.parse(fs.readFileSync(file, "utf-8"));
  
  console.log(`Applying answers for ${answers.length} questions to PRODUCTION...`);
  console.log("This will update the live database.");
  console.log("");

  let applied = 0;
  let errors = 0;
  let skipped = 0;

  for (const entry of answers) {
    const { questionId, options } = entry;

    // Validate
    if (!questionId || !options || options.length !== 4) {
      console.error(`SKIP: Invalid entry for ${questionId}`);
      skipped++;
      continue;
    }
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      console.error(`SKIP: ${questionId} has ${correctCount} correct answers`);
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Delete existing answers
        await tx.answerOption.deleteMany({ where: { questionId } });
        
        // Create new answers
        await tx.question.update({
          where: { id: questionId },
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
        console.log(`Progress: ${applied}/${answers.length} applied...`);
      }
    } catch (err) {
      console.error(`ERROR: ${questionId}: ${err.message}`);
      errors++;
    }
  }

  console.log("");
  console.log(`Done. Applied: ${applied}, Errors: ${errors}, Skipped: ${skipped}`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
