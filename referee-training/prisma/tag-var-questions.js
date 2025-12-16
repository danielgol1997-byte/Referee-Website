const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tagVarQuestions() {
  console.log('Starting VAR tagging...');

  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { text: { contains: 'VAR', mode: 'insensitive' } },
        { text: { contains: 'Video Assistant Referee', mode: 'insensitive' } },
        { explanation: { contains: 'VAR', mode: 'insensitive' } },
        { explanation: { contains: 'Video Assistant Referee', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`Found ${questions.length} potential VAR questions.`);

  let updatedCount = 0;

  for (const q of questions) {
    // Double check with regex to ensure "VAR" is a whole word if it's short
    // Actually "VAR" usually appears as "VAR" or "V.A.R.". 
    // Case insensitive 'contains' might match "variable" (unlikely in this context but possible).
    // Let's rely on the query for now but refine if needed.
    // Given the context (football laws), "var" appearing in other words is possible (e.g. "various", "forward").
    // So simple 'contains' is risky.

    const text = (q.text || '').toLowerCase();
    const explanation = (q.explanation || '').toLowerCase();
    
    const varRegex = /\bvar\b|\bvideo assistant referee\b/;

    if (varRegex.test(text) || varRegex.test(explanation)) {
        await prisma.question.update({
            where: { id: q.id },
            data: { isVar: true }
        });
        updatedCount++;
        // console.log(`Tagged Question ID ${q.id}: ${q.text.substring(0, 50)}...`);
    } else {
        // console.log(`Skipped (false positive) Question ID ${q.id}: ${q.text.substring(0, 50)}...`);
    }
  }

  console.log(`Successfully tagged ${updatedCount} questions as VAR.`);
}

tagVarQuestions()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
