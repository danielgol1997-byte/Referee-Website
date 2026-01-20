const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Define the 14 Main Categories (Rainbow Order)
const CATEGORY_TAGS = [
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

async function syncTags() {
  console.log('🚀 Starting Safe Tag Sync...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Sync Categories
  console.log('\n📦 Syncing 14 Category Tags...');
  for (const cat of CATEGORY_TAGS) {
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
    
    // Upsert: Create if doesn't exist, Update if it does
    await prisma.tag.upsert({
      where: { name: cat.name }, // Match by name
      update: {
        category: 'CATEGORY',
        color: cat.color,
        isActive: true,
        slug: slug // Ensure slug is standard
      },
      create: {
        name: cat.name,
        slug: slug,
        category: 'CATEGORY',
        color: cat.color,
        isActive: true,
        description: `Main category for ${cat.name}`
      }
    });
    console.log(`   ✅ Synced: ${cat.name}`);
  }

  // 2. Ensure "Uses Arms Illegally" renaming (Migration from old name)
  const oldTag = await prisma.tag.findFirst({
    where: { 
      name: 'Illegal Use Of Arms',
      category: 'CRITERIA'
    }
  });

  if (oldTag) {
    console.log('\n🔄 Migrating old "Illegal Use Of Arms" criteria tag...');
    try {
      await prisma.tag.update({
        where: { id: oldTag.id },
        data: {
          name: 'Uses Arms Illegally',
          slug: 'uses-arms-illegally'
        }
      });
      console.log('   ✅ Renamed to "Uses Arms Illegally" (to avoid conflict with new Category)');
    } catch (e) {
      console.log('   ⚠️ Could not rename (might already exist):', e.message);
    }
  }

  console.log('\n✨ Sync Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Safe to run on Production.');
  console.log('❌ Does NOT delete any existing tags.');
  console.log('❌ Does NOT touch Laws of the Game or other data.');
}

syncTags()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
