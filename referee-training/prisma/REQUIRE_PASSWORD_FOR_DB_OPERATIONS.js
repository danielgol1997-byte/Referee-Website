/**
 * DATABASE PROTECTION SYSTEM
 * 
 * This module MUST be used before ANY destructive database operations.
 * It requires the password "Howdoyoud1!" to proceed with operations like:
 * - DROP DATABASE
 * - DROP SCHEMA
 * - TRUNCATE
 * - DELETE (bulk)
 * - prisma migrate reset
 * - prisma db push --accept-data-loss
 * 
 * NEVER bypass this check!
 */

const readline = require('readline');

const REQUIRED_PASSWORD = "Howdoyoud1!";
const DANGEROUS_OPERATIONS = [
  'DROP',
  'TRUNCATE',
  'DELETE FROM',
  'migrate reset',
  'db push --accept-data-loss',
  'clear all',
  'reset database',
  'drop schema'
];

/**
 * Prompts user for password before allowing destructive operations
 * @param {string} operationDescription - Description of what will be deleted/modified
 * @returns {Promise<boolean>} - true if password is correct, false otherwise
 */
async function requirePasswordForDatabaseOperation(operationDescription) {
  console.log('\n🔴 ═══════════════════════════════════════════════════════════════');
  console.log('🔴 DESTRUCTIVE DATABASE OPERATION DETECTED');
  console.log('🔴 ═══════════════════════════════════════════════════════════════\n');
  console.log(`⚠️  Operation: ${operationDescription}`);
  console.log('\n❗ This operation will permanently delete or modify data.');
  console.log('❗ This action CANNOT be undone!\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔑 Enter password to proceed: ', (answer) => {
      rl.close();
      
      if (answer.trim() === REQUIRED_PASSWORD) {
        console.log('\n✅ Password correct. Proceeding with operation...\n');
        resolve(true);
      } else {
        console.log('\n❌ INCORRECT PASSWORD. Operation CANCELLED.');
        console.log('❌ Database remains unchanged.\n');
        resolve(false);
      }
    });
  });
}

/**
 * Checks if a command/query contains dangerous operations
 * @param {string} command - The command or query to check
 * @returns {boolean} - true if command contains dangerous operations
 */
function isDangerousOperation(command) {
  const upperCommand = command.toUpperCase();
  return DANGEROUS_OPERATIONS.some(op => upperCommand.includes(op.toUpperCase()));
}

/**
 * Wrapper for prisma operations that require protection
 * @param {Function} operation - The async operation to execute
 * @param {string} description - Description of the operation
 * @returns {Promise<any>} - Result of the operation or null if cancelled
 */
async function protectedPrismaOperation(operation, description) {
  const allowed = await requirePasswordForDatabaseOperation(description);
  
  if (!allowed) {
    throw new Error('Operation cancelled by user (incorrect password)');
  }
  
  return await operation();
}

// Export functions
module.exports = {
  requirePasswordForDatabaseOperation,
  isDangerousOperation,
  protectedPrismaOperation,
  DANGEROUS_OPERATIONS
};

// If run directly, show usage example
if (require.main === module) {
  console.log('\n📖 DATABASE PROTECTION SYSTEM - Usage Example:\n');
  console.log('```javascript');
  console.log('const { requirePasswordForDatabaseOperation, protectedPrismaOperation } = require("./REQUIRE_PASSWORD_FOR_DB_OPERATIONS");');
  console.log('');
  console.log('// Before dropping schema:');
  console.log('const allowed = await requirePasswordForDatabaseOperation("DROP SCHEMA public CASCADE");');
  console.log('if (!allowed) process.exit(1);');
  console.log('');
  console.log('// Or use wrapper:');
  console.log('await protectedPrismaOperation(');
  console.log('  async () => { /* your dangerous operation */ },');
  console.log('  "Reset entire database"');
  console.log(');');
  console.log('```\n');
}
