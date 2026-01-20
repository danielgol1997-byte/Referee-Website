const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tags that were placeholders (not from RAP OCR extraction)
const PLACEHOLDER_TAG_NAMES = [
  // From old seed file - not from RAP
  'Advantage',
  'Clear Decision',
  'Difficult Decision',
  'Controversial',
  
  // Duplicate/placeholder scenarios
  'Corner Kick', // We have "Corner Kick Scenario"
  'Counter Attack',
  'Free Kick',
  'Kick Off', // We have "Kick Off" but it should be restart
  'Penalty', // Generic, we have detailed scenarios
  'Penalty Area',
  'Set Piece',
  'Throw In', // Should be in restarts only
];

async function removePlaceholderTags() {
  console.log('🗑️  Removing placeholder tags that weren\'t from RAP extraction...\n');

  for (const tagName of PLACEHOLDER_TAG_NAMES) {
    try {
      const tag = await prisma.tag.findFirst({
        where: { name: tagName },
        include: {
          _count: {
            select: { videos: true }
          }
        }
      });

      if (!tag) {
        console.log(`⏭️  Tag "${tagName}" not found, skipping...`);
        continue;
      }

      if (tag._count.videos > 0) {
        console.log(`⚠️  Tag "${tagName}" is used by ${tag._count.videos} video(s). Skipping deletion for safety.`);
        continue;
      }

      await prisma.tag.delete({
        where: { id: tag.id }
      });

      console.log(`✅ Deleted placeholder tag: "${tagName}"`);
    } catch (error) {
      console.error(`❌ Error deleting tag "${tagName}":`, error.message);
    }
  }

  console.log('\n✨ Placeholder tag cleanup complete!');
  
  // Show remaining tag counts
  const counts = await prisma.tag.groupBy({
    by: ['category'],
    _count: true,
    orderBy: {
      category: 'asc'
    }
  });

  console.log('\n📊 Remaining tags by category:');
  for (const count of counts) {
    console.log(`   ${count.category}: ${count._count} tags`);
  }
}

removePlaceholderTags()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
