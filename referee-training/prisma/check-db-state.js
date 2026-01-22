const { PrismaClient } = require('@prisma/client');

async function checkDatabaseState() {
  const prisma = new PrismaClient();

  try {
    console.log('Checking database state...\n');

    // Check if TagCategory table exists
    console.log('Checking if TagCategory table exists...');
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'TagCategory'
        );
      `);
      console.log('TagCategory table exists:', result[0].exists);
    } catch (err) {
      console.log('Error checking TagCategory table:', err.message);
    }

    // Check Tag table columns
    console.log('\nChecking Tag table columns...');
    try {
      const columns = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Tag'
        ORDER BY ordinal_position;
      `);
      console.log('Tag table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } catch (err) {
      console.log('Error checking Tag columns:', err.message);
    }

    // Check if TagCategory enum type exists
    console.log('\nChecking if TagCategory enum type exists...');
    try {
      const enumTypes = await prisma.$queryRawUnsafe(`
        SELECT typname 
        FROM pg_type 
        WHERE typname = 'TagCategory';
      `);
      console.log('TagCategory enum exists:', enumTypes.length > 0);
      if (enumTypes.length > 0) {
        console.log('  Note: This enum needs to be dropped before creating the table');
      }
    } catch (err) {
      console.log('Error checking enum:', err.message);
    }

    // Count tags
    console.log('\nCounting tags...');
    try {
      const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Tag";`);
      console.log(`Total tags: ${count[0].count}`);
    } catch (err) {
      console.log('Error counting tags:', err.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
