const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function alignTagColors() {
  console.log('🎨 Aligning tag colors to their parents...');

  // 1. Get all CATEGORY tags (The Source of Truth for colors)
  const categoryTags = await prisma.tag.findMany({
    where: { category: 'CATEGORY' }
  });

  const colorMap = {}; // 'Handball' -> '#6BCF7F'
  categoryTags.forEach(cat => {
    colorMap[cat.name] = cat.color;
  });

  console.log(`\n📚 Found ${categoryTags.length} parent categories.`);

  // 2. Fix CRITERIA tags
  const criteriaTags = await prisma.tag.findMany({
    where: { 
      category: 'CRITERIA',
      parentCategory: { not: null }
    }
  });

  console.log(`\n🔧 Checking ${criteriaTags.length} criteria tags...`);

  let updatedCount = 0;

  for (const tag of criteriaTags) {
    if (!tag.parentCategory) continue;

    const correctColor = colorMap[tag.parentCategory];
    
    if (correctColor && tag.color !== correctColor) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { color: correctColor }
      });
      console.log(`   ✅ Fixed: "${tag.name}" (${tag.parentCategory}) -> ${correctColor}`);
      updatedCount++;
    }
  }

  console.log(`\n✨ Updated ${updatedCount} criteria tags to match their parent category color.`);

  // 3. Fix other groups to be consistent (Optional: Reset to a main group color?)
  // For now, let's strictly fix the Criteria hierarchy as that's the main "parent/child" structure.
}

alignTagColors()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
