// Reads a JSON answers file and applies them to the database
// Usage: node prisma/apply-answers.js /path/to/answers-batch.json

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node prisma/apply-answers.js <answers-file.json>");
    process.exit(1);
  }

  const answers = JSON.parse(fs.readFileSync(file, "utf-8"));
  console.log(`Applying answers for ${answers.length} questions...`);

  let applied = 0;
  let errors = 0;

  for (const entry of answers) {
    const { questionId, options } = entry;

    // Validate
    if (!questionId || !options || options.length !== 4) {
      console.error(`SKIP: Invalid entry for ${questionId}`);
      errors++;
      continue;
    }
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      console.error(`SKIP: ${questionId} has ${correctCount} correct answers`);
      errors++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.answerOption.deleteMany({ where: { questionId } });
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
    } catch (err) {
      console.error(`ERROR: ${questionId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Done. Applied: ${applied}, Errors: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
