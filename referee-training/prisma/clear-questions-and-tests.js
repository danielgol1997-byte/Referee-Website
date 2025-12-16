/**
 * Script to clear all existing questions and tests from the database
 * 
 * WARNING: This will delete ALL questions, answer options, test sessions, 
 * test answers, mandatory tests, and user test completions.
 * 
 * Run with: node prisma/clear-questions-and-tests.js --force
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

async function clearAll() {
  console.log('Starting cleanup...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete TestAnswers (references Question and TestSession)
    console.log('Deleting test answers...');
    const testAnswersDeleted = await prisma.testAnswer.deleteMany({});
    console.log(`✓ Deleted ${testAnswersDeleted.count} test answers`);

    // 2. Delete UserTestCompletions (references MandatoryTest and TestSession)
    console.log('Deleting user test completions...');
    const completionsDeleted = await prisma.userTestCompletion.deleteMany({});
    console.log(`✓ Deleted ${completionsDeleted.count} user test completions`);

    // 3. Delete TestSessions (references MandatoryTest)
    console.log('Deleting test sessions...');
    const sessionsDeleted = await prisma.testSession.deleteMany({});
    console.log(`✓ Deleted ${sessionsDeleted.count} test sessions`);

    // 4. Delete MandatoryTests
    console.log('Deleting mandatory tests...');
    const testsDeleted = await prisma.mandatoryTest.deleteMany({});
    console.log(`✓ Deleted ${testsDeleted.count} mandatory tests`);

    // 5. Delete StudyProgress (references Question)
    console.log('Deleting study progress...');
    const progressDeleted = await prisma.studyProgress.deleteMany({});
    console.log(`✓ Deleted ${progressDeleted.count} study progress records`);

    // 6. Delete AnswerOptions (references Question)
    console.log('Deleting answer options...');
    const answerOptionsDeleted = await prisma.answerOption.deleteMany({});
    console.log(`✓ Deleted ${answerOptionsDeleted.count} answer options`);

    // 7. Delete Questions
    console.log('Deleting questions...');
    const questionsDeleted = await prisma.question.deleteMany({});
    console.log(`✓ Deleted ${questionsDeleted.count} questions`);

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`- Questions: ${questionsDeleted.count}`);
    console.log(`- Answer Options: ${answerOptionsDeleted.count}`);
    console.log(`- Mandatory Tests: ${testsDeleted.count}`);
    console.log(`- Test Sessions: ${sessionsDeleted.count}`);
    console.log(`- Test Answers: ${testAnswersDeleted.count}`);
    console.log(`- User Test Completions: ${completionsDeleted.count}`);
    console.log(`- Study Progress: ${progressDeleted.count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check for force flag
const force = process.argv.includes('--force');

if (force) {
  clearAll()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('⚠️  WARNING: This will delete ALL questions and tests from the database!');
  console.log('This includes:');
  console.log('  - All questions');
  console.log('  - All answer options');
  console.log('  - All mandatory tests');
  console.log('  - All test sessions');
  console.log('  - All test answers');
  console.log('  - All user test completions');
  console.log('  - All study progress\n');

  rl.question('Are you sure you want to continue? Type "yes" to confirm: ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      rl.close();
      clearAll()
        .catch((error) => {
          console.error('Fatal error:', error);
          process.exit(1);
        });
    } else {
      console.log('Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }
  });
}
