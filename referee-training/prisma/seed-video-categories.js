/**
 * Seed Video Library Categories
 * UEFA RAP 2025:1 Structure
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Seeding Video Library Categories (UEFA RAP Structure)...');

  // Define the UEFA RAP category structure
  const categories = [
    {
      name: 'Challenges',
      slug: 'challenges',
      icon: '🏃',
      description: 'Critical game situations requiring instant calls',
      color: '#FF4D6D',
      order: 1,
      children: [
        { name: 'Fouls', slug: 'fouls', icon: '⚠️', order: 1 },
        { name: 'Handball', slug: 'handball', icon: '🖐️', order: 2 },
        { name: 'Holding', slug: 'holding', icon: '🤝', order: 3 },
        { name: 'Offside', slug: 'offside', icon: '🚩', order: 4 },
      ]
    },
    {
      name: 'Management',
      slug: 'management',
      icon: '🎯',
      description: 'Game control and referee skills',
      color: '#00A5E8',
      order: 2,
      children: [
        { name: 'Advantage', slug: 'advantage', icon: '⚡', order: 1 },
        { name: 'Communication', slug: 'communication', icon: '💬', order: 2 },
        { name: 'Positioning', slug: 'positioning', icon: '📍', order: 3 },
        { name: 'Teamwork', slug: 'teamwork', icon: '👥', order: 4 },
      ]
    },
    {
      name: 'Disciplinary',
      slug: 'disciplinary',
      icon: '🟨',
      description: 'Card decisions and misconduct',
      color: '#F5B400',
      order: 3,
      children: [
        { name: 'Yellow Cards', slug: 'yellow-cards', icon: '🟨', order: 1 },
        { name: 'Red Cards - DOGSO', slug: 'red-cards-dogso', icon: '🔴', order: 2 },
        { name: 'Red Cards - SFP', slug: 'red-cards-sfp', icon: '🔴', order: 3 },
        { name: 'Second Yellow Cards', slug: 'second-yellow', icon: '🟨🟨', order: 4 },
      ]
    },
    {
      name: 'Procedures',
      slug: 'procedures',
      icon: '📏',
      description: 'Restart management and protocols',
      color: '#1BC47D',
      order: 4,
      children: [
        { name: 'Free Kicks', slug: 'free-kicks', icon: '⚽', order: 1 },
        { name: 'Penalty Kicks', slug: 'penalty-kicks', icon: '🎯', order: 2 },
        { name: 'Restarts', slug: 'restarts', icon: '🔄', order: 3 },
        { name: 'Substitutions', slug: 'substitutions', icon: '🔄', order: 4 },
      ]
    },
    {
      name: 'VAR',
      slug: 'var',
      icon: '🎬',
      description: 'Video Assistant Referee decisions',
      color: '#9B59B6',
      order: 5,
      children: [
        { name: 'Goals/No Goals', slug: 'goals-no-goals', icon: '⚽', order: 1 },
        { name: 'Penalty Decisions', slug: 'penalty-decisions', icon: '🎯', order: 2 },
        { name: 'Red Card Incidents', slug: 'red-card-incidents', icon: '🔴', order: 3 },
        { name: 'Mistaken Identity', slug: 'mistaken-identity', icon: '👤', order: 4 },
      ]
    },
  ];

  // Create categories with their children
  for (const categoryData of categories) {
    const { children, ...parentData } = categoryData;

    // Create or update parent category
    const parent = await prisma.videoCategory.upsert({
      where: { slug: parentData.slug },
      update: parentData,
      create: parentData,
    });

    console.log(`✅ Created parent category: ${parent.name}`);

    // Create or update child categories
    if (children) {
      for (const childData of children) {
        const child = await prisma.videoCategory.upsert({
          where: { slug: childData.slug },
          update: {
            ...childData,
            parentId: parent.id,
          },
          create: {
            ...childData,
            parentId: parent.id,
          },
        });
        console.log(`  ↳ Created subcategory: ${child.name}`);
      }
    }
  }

  // TAGS ARE NOW 100% USER-MANAGED VIA ADMIN UI
  // DO NOT seed tags here - if you delete a tag, it should stay deleted
  // Tags are managed entirely through the Super Admin interface
  // To restore the 14 rainbow categories, run: node scripts/restore-tag-system.js
  console.log('\n🏷️  Skipping tag seeding (tags are 100% user-managed via admin UI)');

  console.log('\n✨ Video library seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding video categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
