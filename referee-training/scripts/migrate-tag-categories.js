/**
 * Migrate existing tags from old category enum to new one
 * Maps: GENERAL -> CATEGORY, CONCEPT -> CRITERIA, COMPETITION -> SCENARIO
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating tag categories...\n');

  // Update tags with old enum values
  const updates = [
    // Map old categories to new ones
    { old: 'GENERAL', new: 'CATEGORY' },
    { old: 'CONCEPT', new: 'CRITERIA' },
    { old: 'COMPETITION', new: 'SCENARIO' },
    // SCENARIO stays the same
  ];

  for (const { old, new: newCategory } of updates) {
    try {
      // Use raw SQL to update enum values since Prisma doesn't support enum value changes directly
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "Tag" SET category = $1::text::"TagCategory" WHERE category = $2::text::"TagCategory"`,
        newCategory,
        old
      );
      console.log(`  ✅ Migrated ${result} tags from ${old} to ${newCategory}`);
    } catch (error) {
      console.error(`  ❌ Error migrating ${old}:`, error.message);
    }
  }

  console.log('\n✨ Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
