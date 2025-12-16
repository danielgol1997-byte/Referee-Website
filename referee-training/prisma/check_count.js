const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCount() {
  const count = await prisma.question.count();
  console.log(`Total questions in database: ${count}`);
}

checkCount()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
