#!/usr/bin/env node
/**
 * DATABASE PERSISTENCE TEST
 * 
 * This script tests if your database is actually persisting writes.
 * Run: node scripts/test-db-persistence.js
 * 
 * If this fails, your database isn't persisting and you need to fix your DATABASE_URL.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPersistence() {
  console.log('🧪 Testing Database Persistence...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
  console.log('');

  try {
    // 1. Create a test tag
    console.log('1️⃣ Creating test tag...');
    const testTag = await prisma.tag.create({
      data: {
        name: `TEST_PERSISTENCE_${Date.now()}`,
        slug: `test-persistence-${Date.now()}`,
        category: 'SCENARIO',
        color: '#FF0000',
        isActive: true,
      },
    });
    console.log(`   ✅ Created: ${testTag.id} - ${testTag.name}`);

    // 2. Immediately verify it exists
    console.log('\n2️⃣ Verifying creation...');
    const verify1 = await prisma.tag.findUnique({
      where: { id: testTag.id },
    });
    if (!verify1) {
      console.error('   ❌ FAILED: Tag not found immediately after creation!');
      process.exit(1);
    }
    console.log(`   ✅ Verified: ${verify1.name}`);

    // 3. Update it
    console.log('\n3️⃣ Updating test tag...');
    const updated = await prisma.tag.update({
      where: { id: testTag.id },
      data: { color: '#00FF00' },
    });
    console.log(`   ✅ Updated color to: ${updated.color}`);

    // 4. Verify update persisted
    console.log('\n4️⃣ Verifying update...');
    const verify2 = await prisma.tag.findUnique({
      where: { id: testTag.id },
    });
    if (verify2.color !== '#00FF00') {
      console.error(`   ❌ FAILED: Color not updated! Expected #00FF00, got ${verify2.color}`);
      process.exit(1);
    }
    console.log(`   ✅ Verified: Color is ${verify2.color}`);

    // 5. Delete it
    console.log('\n5️⃣ Deleting test tag...');
    await prisma.tag.delete({
      where: { id: testTag.id },
    });
    console.log(`   ✅ Deleted`);

    // 6. Verify deletion
    console.log('\n6️⃣ Verifying deletion...');
    const verify3 = await prisma.tag.findUnique({
      where: { id: testTag.id },
    });
    if (verify3) {
      console.error('   ❌ FAILED: Tag still exists after deletion!');
      process.exit(1);
    }
    console.log(`   ✅ Verified: Tag is deleted`);

    console.log('\n✨ ALL TESTS PASSED!');
    console.log('✅ Your database IS persisting writes correctly.\n');
    console.log('💡 If you\'re still losing data, check:');
    console.log('   1. Are you running `prisma migrate reset`? (DON\'T!)');
    console.log('   2. Is your DATABASE_URL pointing to a persistent database?');
    console.log('   3. Are you using Docker without a named volume?');
    console.log('   4. Check server logs for errors when you delete/edit tags.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nThis means your database operations are failing.');
    console.error('Check your DATABASE_URL and database connection.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPersistence();
