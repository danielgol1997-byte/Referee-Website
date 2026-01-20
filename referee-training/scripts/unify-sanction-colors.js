#!/usr/bin/env node
/**
 * UNIFY SANCTION TAG COLORS
 * 
 * Sets all SANCTION tags to the same color (#F5B400 - Gold)
 * Run: node scripts/unify-sanction-colors.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SANCTION_COLOR = '#EC4899'; // Pink/Magenta - distinct and vibrant

async function unifySanctionColors() {
  console.log('🎨 Unifying SANCTION tag colors...\n');

  const sanctionTags = await prisma.tag.findMany({
    where: { category: 'SANCTION' }
  });

  console.log(`Found ${sanctionTags.length} SANCTION tags\n`);

  let updated = 0;

  for (const tag of sanctionTags) {
    if (tag.color !== SANCTION_COLOR) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { color: SANCTION_COLOR }
      });
      console.log(`   ✅ Updated: "${tag.name}" -> ${SANCTION_COLOR}`);
      updated++;
    } else {
      console.log(`   ✓ Already correct: "${tag.name}"`);
    }
  }

  console.log(`\n✨ Updated ${updated} tags to unified SANCTION color.\n`);
}

unifySanctionColors()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
