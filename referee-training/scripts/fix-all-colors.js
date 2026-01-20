const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Challenges', color: '#FF6B6B', order: 1 },           // Red
  { name: 'DOGSO', color: '#FF8C42', order: 2 },                // Orange
  { name: 'SPA', color: '#FFD93D', order: 3 },                  // Yellow
  { name: 'Handball', color: '#6BCF7F', order: 4 },             // Green
  { name: 'Holding', color: '#4ECDC4', order: 5 },              // Teal
  { name: 'Illegal Use Of Arms', color: '#45B7D1', order: 6 },  // Light Blue
  { name: 'Penalty Area Decisions', color: '#5F9DF7', order: 7 }, // Blue
  { name: 'Simulation', color: '#9B72CB', order: 8 },           // Purple
  { name: 'Advantage', color: '#C77DFF', order: 9 },            // Light Purple
  { name: 'Dissent', color: '#E0ACD5', order: 10 },             // Pink
  { name: 'Referee Abuse', color: '#FF6B9D', order: 11 },       // Hot Pink
  { name: 'Offside', color: '#F72585', order: 12 },             // Magenta
  { name: 'Teamwork', color: '#7209B7', order: 13 },            // Deep Purple
  { name: 'Laws Of The Game', color: '#560BAD', order: 14 },    // Dark Purple
];

async function fixAllColors() {
  console.log('🌈 MASTER COLOR FIX STARTED 🌈');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Fix Parent Category Colors
  console.log('\n📦 1. Forcing correct colors on 14 Main Categories...');
  
  for (const cat of CATEGORIES) {
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-');
    
    // Update existing or create
    await prisma.tag.upsert({
      where: { name: cat.name },
      update: {
        color: cat.color,
        category: 'CATEGORY',
        isActive: true,
        order: cat.order
      },
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
    console.log(`   ✅ Corrected: ${cat.name} -> ${cat.color}`);
  }

  // 2. Align Criteria Tags to Parent
  console.log('\n🔧 2. Aligning Criteria tags to match their parents...');
  
  const criteriaTags = await prisma.tag.findMany({
    where: { 
      category: 'CRITERIA',
      parentCategory: { not: null }
    }
  });

  const colorMap = {};
  CATEGORIES.forEach(c => colorMap[c.name] = c.color);

  let updatedCriteria = 0;

  for (const tag of criteriaTags) {
    const correctColor = colorMap[tag.parentCategory];
    
    if (correctColor && tag.color !== correctColor) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { color: correctColor }
      });
      // console.log(`   ✅ Fixed criteria: "${tag.name}" -> ${correctColor}`);
      updatedCriteria++;
    }
  }
  console.log(`   ✅ Updated ${updatedCriteria} criteria tags to match parent colors.`);

  console.log('\n✨ ALL COLORS FIXED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

fixAllColors()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
