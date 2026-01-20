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

async function updateCategoryTags() {
  console.log('🌈 Updating CATEGORY tags with rainbow colors...\n');

  for (const category of CATEGORIES) {
    try {
      // Check if tag exists
      const existing = await prisma.tag.findFirst({
        where: {
          name: category.name,
          category: 'CATEGORY'
        }
      });

      if (existing) {
        // Update existing tag
        await prisma.tag.update({
          where: { id: existing.id },
          data: {
            color: category.color,
            isActive: true
          }
        });
        console.log(`✅ Updated: ${category.name} (${category.color})`);
      } else {
        // Create new tag
        const slug = category.name.toLowerCase().replace(/\s+/g, '-');
        await prisma.tag.create({
          data: {
            name: category.name,
            slug: slug,
            category: 'CATEGORY',
            color: category.color,
            isActive: true,
            description: `Main category for ${category.name} decisions`
          }
        });
        console.log(`✨ Created: ${category.name} (${category.color})`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${category.name}:`, error.message);
    }
  }

  console.log('\n✅ Category tags updated successfully!');
}

updateCategoryTags()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
