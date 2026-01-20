/**
 * Seed RAP Video Categories
 * UEFA RAP 2025:1 structure with exact category codes from decision images
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RAP_CATEGORIES = [
  {
    name: 'Decision Making',
    slug: 'decision-making',
    description: 'Fouls, handball, and key match decisions',
    rapCategoryCode: 'A', // Decision images A1-A69
    color: '#003366', // UEFA Dark Blue
    icon: null, // No emojis - UEFA professional style
    order: 1,
  },
  {
    name: 'Management',
    slug: 'management',
    description: 'Game control, communication, and positioning',
    rapCategoryCode: 'B', // Decision images B1-B41
    color: '#00D4FF', // UEFA Cyan
    icon: null,
    order: 2,
  },
  {
    name: 'Offside',
    slug: 'offside',
    description: 'Offside situations and positioning',
    rapCategoryCode: 'C', // Decision images C1-C38
    color: '#FF6B00', // Orange
    icon: null,
    order: 3,
  },
  {
    name: 'Teamwork',
    slug: 'teamwork',
    description: 'Referee team coordination',
    rapCategoryCode: 'D', // Decision images D1-D16
    color: '#00B359', // Green
    icon: null,
    order: 4,
  },
  {
    name: 'Laws of the Game',
    slug: 'laws-of-the-game',
    description: 'Law interpretation and application',
    rapCategoryCode: 'L', // Decision images L1-L21
    color: '#8B0000', // Dark Red
    icon: null,
    order: 5,
  },
];

async function seedRAPCategories() {
  console.log('🌱 Seeding UEFA RAP video categories...');

  try {
    for (const category of RAP_CATEGORIES) {
      const existing = await prisma.videoCategory.findUnique({
        where: { slug: category.slug },
      });

      if (existing) {
        console.log(`   ✓ Category "${category.name}" already exists, updating...`);
        await prisma.videoCategory.update({
          where: { id: existing.id },
          data: {
            name: category.name,
            description: category.description,
            rapCategoryCode: category.rapCategoryCode,
            color: category.color,
            icon: category.icon,
            order: category.order,
          },
        });
      } else {
        console.log(`   + Creating category "${category.name}"...`);
        await prisma.videoCategory.create({
          data: category,
        });
      }
    }

    console.log('✅ RAP categories seeded successfully!');
    
    // Display summary
    const totalCategories = await prisma.videoCategory.count();
    console.log(`\n📊 Total video categories: ${totalCategories}`);
    
    const rapCategories = await prisma.videoCategory.findMany({
      where: {
        rapCategoryCode: { not: null },
      },
      orderBy: { order: 'asc' },
      select: {
        name: true,
        rapCategoryCode: true,
        slug: true,
        _count: {
          select: { videos: true },
        },
      },
    });

    console.log('\n🎯 RAP Categories:');
    rapCategories.forEach((cat) => {
      console.log(`   ${cat.rapCategoryCode}: ${cat.name} (${cat._count.videos} videos)`);
    });

  } catch (error) {
    console.error('❌ Error seeding RAP categories:', error);
    throw error;
  }
}

async function main() {
  await seedRAPCategories();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
