/**
 * PROTECTED DATABASE RESET SCRIPT
 * 
 * This script safely resets the database with password protection.
 * Use this INSTEAD of direct DROP/TRUNCATE commands.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const { requirePasswordForDatabaseOperation } = require('./REQUIRE_PASSWORD_FOR_DB_OPERATIONS');

async function resetDatabase() {
  console.log('\n🔄 DATABASE RESET UTILITY\n');
  console.log('This will:');
  console.log('  1. Drop and recreate the database schema');
  console.log('  2. Run all migrations');
  console.log('  3. Optionally seed the database\n');

  // Require password before proceeding
  const allowed = await requirePasswordForDatabaseOperation('RESET ENTIRE DATABASE (drop schema, run migrations, seed)');
  
  if (!allowed) {
    console.log('\n❌ Database reset cancelled.\n');
    process.exit(1);
  }

  try {
    console.log('\n📊 Step 1: Dropping and recreating schema...');
    execSync(
      'psql postgresql://referee_admin:referee_password_2024@localhost:5434/referee_training -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"',
      { stdio: 'inherit', cwd: __dirname + '/..' }
    );

    console.log('\n📊 Step 2: Running migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: __dirname + '/..' });

    console.log('\n📊 Step 3: Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname + '/..' });

    console.log('\n📊 Step 4: Seeding database...');
    execSync('npx prisma db seed', { stdio: 'inherit', cwd: __dirname + '/..' });

    console.log('\n✅ Database reset complete!\n');
  } catch (error) {
    console.error('\n❌ Error during database reset:', error.message);
    process.exit(1);
  }
}

resetDatabase();
