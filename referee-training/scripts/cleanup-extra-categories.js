#!/usr/bin/env node
/**
 * CLEANUP EXTRA CATEGORIES
 * 
 * Removes any CATEGORY tags that aren't in the official 14 list.
 * Run: node scripts/cleanup-extra-categories.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OFFICIAL_CATEGORIES = [
  'Challenges',
  'DOGSO',
  'SPA',
  'Handball',
  'Holding',
  'Illegal Use Of Arms',
  'Penalty Area Decisions',
  'Simulation',
  'Advantage',
  'Dissent',
  'Referee Abuse',
  'Offside',
  'Teamwork',
  'Laws Of The Game',
];

async function cleanup() {
  console.log('🧹 Cleaning up extra CATEGORY tags...\n');

  const allCategoryTags = await prisma.tag.findMany({
    where: { category: 'CATEGORY' }
  });

  console.log(`Found ${allCategoryTags.length} CATEGORY tags\n`);

  const extras = allCategoryTags.filter(t => !OFFICIAL_CATEGORIES.includes(t.name));

  if (extras.length === 0) {
    console.log('✅ No extra categories found. You have exactly 14!\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  Found ${extras.length} extra category tag(s):\n`);
  extras.forEach(t => {
    console.log(`   - ${t.name} (slug: ${t.slug})`);
  });

  console.log('\n🗑️  Deleting extra categories...\n');

  let deleted = 0;
  let skipped = 0;

  for (const extra of extras) {
    // Check if it's used by any videos
    const usageCount = await prisma.videoTag.count({
      where: { tagId: extra.id }
    });

    if (usageCount > 0) {
      console.log(`   ⚠️  Skipping "${extra.name}" - used by ${usageCount} video(s)`);
      skipped++;
      continue;
    }

    await prisma.tag.delete({
      where: { id: extra.id }
    });
    console.log(`   ✅ Deleted: ${extra.name}`);
    deleted++;
  }

  console.log(`\n✨ Cleanup complete: ${deleted} deleted, ${skipped} skipped (in use)\n`);

  await prisma.$disconnect();
}

cleanup();
