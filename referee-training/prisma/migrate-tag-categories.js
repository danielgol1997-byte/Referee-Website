const { PrismaClient } = require('@prisma/client');

async function migrateTagCategories() {
  const prisma = new PrismaClient();

  try {
    console.log('Starting Tag Category migration...\n');

    // Check if columns already exist (resume from partial migration)
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'Tag';
    `);
    let columnNames = columns.map(c => c.column_name);
    let hasOldCategory = columnNames.includes('oldCategory');
    let hasCategoryId = columnNames.includes('categoryId');

    if (!hasOldCategory && columnNames.includes('category')) {
      // Step 1: Rename the old category column
      console.log('Step 1: Renaming old category column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tag" RENAME COLUMN "category" TO "oldCategory";
      `);
      console.log('✓ Renamed category to oldCategory\n');
      hasOldCategory = true;
      columnNames = columnNames.filter(name => name !== 'category').concat('oldCategory');
    } else {
      console.log('Step 1: ✓ Column already renamed (oldCategory exists)\n');
    }

    if (!hasCategoryId) {
      // Step 2: Add the new categoryId column (nullable)
      console.log('Step 2: Adding new categoryId column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tag" ADD COLUMN "categoryId" TEXT;
      `);
      console.log('✓ Added categoryId column\n');
      hasCategoryId = true;
      columnNames = columnNames.concat('categoryId');
    } else {
      console.log('Step 2: ✓ categoryId column already exists\n');
    }

    if (hasOldCategory) {
      // Step 3: Remove default value from oldCategory
      console.log('Step 3: Removing default value from oldCategory...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tag" 
        ALTER COLUMN "oldCategory" DROP DEFAULT;
      `);
      console.log('✓ Removed default value\n');
      
      // Step 3a: Convert oldCategory from enum to TEXT
      console.log('Step 3a: Converting oldCategory column to TEXT type...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tag" 
        ALTER COLUMN "oldCategory" TYPE TEXT 
        USING "oldCategory"::TEXT;
      `);
      console.log('✓ Converted oldCategory to TEXT\n');
    } else {
      console.log('Step 3: ✓ oldCategory column not present, skipping\n');
    }
    
    // Step 3b: Drop the old TagCategory enum type
    console.log('Step 3b: Dropping old TagCategory enum type...');
    await prisma.$executeRawUnsafe(`
      DROP TYPE IF EXISTS "TagCategory";
    `);
    console.log('✓ Dropped old TagCategory enum\n');

    // Step 4: Check if TagCategory table exists
    const tableCheck = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'TagCategory'
      );
    `);
    
    if (!tableCheck[0].exists) {
      // Create TagCategory table
      console.log('Step 4: Creating TagCategory table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "TagCategory" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "canBeCorrectAnswer" BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "TagCategory_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "TagCategory_name_key" ON "TagCategory"("name");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "TagCategory_slug_key" ON "TagCategory"("slug");
    `);
    
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "TagCategory_isActive_order_idx" ON "TagCategory"("isActive", "order");
      `);
      console.log('✓ Created TagCategory table with indexes\n');
    } else {
      console.log('Step 4: ✓ TagCategory table already exists\n');
    }

    // Step 5: Seed TagCategory with existing categories
    console.log('Step 5: Seeding TagCategory table...');
    
    // Check if categories already exist
    const existingCategories = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "TagCategory";
    `);
    
    if (existingCategories[0].count > 0) {
      console.log(`✓ TagCategory table already has ${existingCategories[0].count} categories\n`);
      
      // Get the existing category mappings
      const existingCats = await prisma.$queryRawUnsafe(`
        SELECT id, slug FROM "TagCategory";
      `);
      var categoryMap = {};
      existingCats.forEach(cat => {
        categoryMap[cat.slug.toUpperCase()] = cat.id;
      });
    } else {
      // Seed the categories
      const categories = [
      {
        name: 'Category',
        slug: 'category',
        description: 'Offence categories (Challenges, DOGSO, SPA, etc.)',
        canBeCorrectAnswer: true,
        order: 1
      },
      {
        name: 'Restarts',
        slug: 'restarts',
        description: 'Restart types (Direct FK, Indirect FK, etc.)',
        canBeCorrectAnswer: true,
        order: 2
      },
      {
        name: 'Criteria',
        slug: 'criteria',
        description: 'Criteria for offences (Careless, Reckless, etc.)',
        canBeCorrectAnswer: true,
        order: 3
      },
      {
        name: 'Sanction',
        slug: 'sanction',
        description: 'Disciplinary sanctions (Yellow, Red, etc.)',
        canBeCorrectAnswer: true,
        order: 4
      },
      {
        name: 'Scenario',
        slug: 'scenario',
        description: 'Game scenarios (Penalty, Free kick, etc.)',
        canBeCorrectAnswer: true,
        order: 5
      }
      ];

      var categoryMap = {};
      for (const cat of categories) {
        const id = `cat_${cat.slug}_${Date.now()}`;
        await prisma.$executeRawUnsafe(`
          INSERT INTO "TagCategory" ("id", "name", "slug", "description", "canBeCorrectAnswer", "order", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
        `, id, cat.name, cat.slug, cat.description, cat.canBeCorrectAnswer, cat.order, true);
        
        categoryMap[cat.slug.toUpperCase()] = id;
        console.log(`  ✓ Created category: ${cat.name} (${id})`);
      }
      console.log('\n');
    }

    if (hasOldCategory) {
      // Step 6: Migrate existing Tag data
      console.log('Step 6: Migrating existing tags...');
      const tags = await prisma.$queryRawUnsafe(`
        SELECT id, "oldCategory" FROM "Tag" WHERE "oldCategory" IS NOT NULL;
      `);
      
      console.log(`Found ${tags.length} tags to migrate`);
      
      for (const tag of tags) {
        const oldCategoryUpper = tag.oldCategory.toUpperCase();
        const newCategoryId = categoryMap[oldCategoryUpper];
        
        if (newCategoryId) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Tag" SET "categoryId" = $1 WHERE id = $2;
          `, newCategoryId, tag.id);
        } else {
          console.log(`  ⚠️  Warning: Unknown category '${tag.oldCategory}' for tag ${tag.id}`);
        }
      }
      console.log(`✓ Migrated ${tags.length} tags\n`);
    } else {
      console.log('Step 6: ✓ oldCategory column not present, skipping\n');
    }

    if (hasOldCategory) {
      // Step 7: Drop the old column
      console.log('Step 7: Dropping old category column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tag" DROP COLUMN "oldCategory";
      `);
      console.log('✓ Dropped oldCategory column\n');
    } else {
      console.log('Step 7: ✓ oldCategory column not present, skipping\n');
    }

    // Step 8: Make categoryId required
    console.log('Step 8: Making categoryId required...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Tag" ALTER COLUMN "categoryId" SET NOT NULL;
    `);
    console.log('✓ Made categoryId NOT NULL\n');

    // Step 9: Add foreign key constraint
    console.log('Step 9: Adding foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Tag" 
      ADD CONSTRAINT "Tag_categoryId_fkey" 
      FOREIGN KEY ("categoryId") 
      REFERENCES "TagCategory"("id") 
      ON DELETE RESTRICT 
      ON UPDATE CASCADE;
    `);
    console.log('✓ Added foreign key constraint\n');

    // Step 10: Create index
    console.log('Step 10: Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "Tag_categoryId_parentCategory_idx" ON "Tag"("categoryId", "parentCategory");
    `);
    console.log('✓ Created indexes\n');

    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTagCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
