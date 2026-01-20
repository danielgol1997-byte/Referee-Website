#!/usr/bin/env node
/**
 * ONE-COMMAND RESTORE SCRIPT
 * 
 * Run this anytime you lose your tag structure:
 *   node scripts/restore-tag-system.js
 * 
 * This restores:
 * - All 14 Category tags with correct rainbow colors
 * - All Criteria tags aligned to their parent categories
 * - All color assignments
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Challenges', color: '#FF6B6B', order: 1 },
  { name: 'DOGSO', color: '#FF8C42', order: 2 },
  { name: 'SPA', color: '#FFD93D', order: 3 },
  { name: 'Handball', color: '#6BCF7F', order: 4 },
  { name: 'Holding', color: '#4ECDC4', order: 5 },
  { name: 'Illegal Use Of Arms', color: '#45B7D1', order: 6 },
  { name: 'Penalty Area Decisions', color: '#5F9DF7', order: 7 },
  { name: 'Simulation', color: '#9B72CB', order: 8 },
  { name: 'Advantage', color: '#C77DFF', order: 9 },
  { name: 'Dissent', color: '#E0ACD5', order: 10 },
  { name: 'Referee Abuse', color: '#FF6B9D', order: 11 },
  { name: 'Offside', color: '#F72585', order: 12 },
  { name: 'Teamwork', color: '#7209B7', order: 13 },
  { name: 'Laws Of The Game', color: '#560BAD', order: 14 },
];

async function restore() {
  console.log('🚀 RESTORING TAG SYSTEM...\n');

  // 1. Restore Categories
  console.log('📦 Restoring 14 Categories...');
  for (const cat of CATEGORIES) {
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
    await prisma.tag.upsert({
      where: { name: cat.name },
      update: { color: cat.color, category: 'CATEGORY', isActive: true, order: cat.order },
      create: {
        name: cat.name,
        slug: slug,
        category: 'CATEGORY',
        color: cat.color,
        isActive: true,
        order: cat.order,
        description: `Main category for ${cat.name}`
      }
    });
  }
  console.log('   ✅ Categories restored\n');

  // 2. Align Criteria Colors
  console.log('🔧 Aligning Criteria colors...');
  const criteriaTags = await prisma.tag.findMany({
    where: { category: 'CRITERIA', parentCategory: { not: null } }
  });

  const colorMap = {};
  CATEGORIES.forEach(c => colorMap[c.name] = c.color);

  let updated = 0;
  for (const tag of criteriaTags) {
    const correctColor = colorMap[tag.parentCategory];
    if (correctColor && tag.color !== correctColor) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { color: correctColor }
      });
      updated++;
    }
  }
  console.log(`   ✅ Updated ${updated} criteria tags\n`);

  console.log('✨ TAG SYSTEM RESTORED!\n');
  console.log('💡 Tip: Run "node scripts/backup-tags.js" before making changes to save state.');
}

restore()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
