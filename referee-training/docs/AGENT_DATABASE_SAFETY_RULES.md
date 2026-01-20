# 🔴 AGENT DATABASE SAFETY RULES 🔴

## CRITICAL: READ BEFORE ANY DATABASE OPERATION

### ❌ ABSOLUTELY FORBIDDEN - NEVER DO THESE WITHOUT USER PASSWORD:

1. **DROP DATABASE** or **DROP SCHEMA**
2. **TRUNCATE** any table
3. **DELETE FROM** (bulk deletes)
4. **`prisma migrate reset`**
5. **`prisma db push --accept-data-loss`**
6. Any SQL command with **CASCADE**
7. Any operation that says "drop", "clear", "reset", "truncate" in the description

### 🔐 REQUIRED PASSWORD SYSTEM

**Password:** `Howdoyoud1!`

Before ANY destructive database operation, you MUST:

```javascript
const { requirePasswordForDatabaseOperation } = require('./prisma/REQUIRE_PASSWORD_FOR_DB_OPERATIONS');

// BEFORE executing dangerous operation:
const allowed = await requirePasswordForDatabaseOperation('Description of what will be deleted');

if (!allowed) {
  console.log('Operation cancelled - wrong password or user declined');
  process.exit(1);
}

// Only proceed if password was correct
```

### ✅ SAFE OPERATIONS (no password required):

- **SELECT** queries (read-only)
- **INSERT** (adding new data)
- **UPDATE** (modifying existing records individually)
- **`npx prisma migrate deploy`** (applying migrations)
- **`npx prisma generate`** (generating client)
- **`npx prisma db seed`** (seeding - usually safe, upserts)

### 🛡️ PROTECTED SCRIPTS TO USE:

Instead of manual commands, use these protected scripts:

1. **Reset Database:** `node prisma/reset-database-protected.js`
   - Includes password protection
   - Drops schema, runs migrations, seeds

2. **Clear Questions:** `node prisma/clear-questions-and-tests.js`
   - Already has confirmation prompts

### 📋 DECISION FLOWCHART:

```
Are you about to:
├─ Delete/drop/truncate data? 
│  └─ YES → ⚠️ REQUIRE PASSWORD (Howdoyoud1!)
│
├─ Modify schema structure?
│  ├─ Using migrations → ✅ OK (migrate deploy)
│  └─ Direct ALTER/DROP → ⚠️ REQUIRE PASSWORD
│
└─ Read or add data?
   └─ YES → ✅ OK (no password needed)
```

### 🚨 IF USER COMPLAINS DATA WAS DELETED:

1. **IMMEDIATELY APOLOGIZE** - this is a critical error
2. **STOP ALL OPERATIONS** 
3. **CHECK FOR BACKUPS** - look for:
   - Production database (can restore from)
   - Database dump files (*.sql, *.dump)
   - Backup directories
4. **RESTORE FROM PRODUCTION** if available
5. **NEVER MAKE EXCUSES** - data loss is unacceptable

### 💾 BEFORE ANY DESTRUCTIVE OPERATION:

Always ask yourself:
- [ ] Is there a backup of this data?
- [ ] Can this be restored from production?
- [ ] Have I asked for the password (Howdoyoud1!)?
- [ ] Has the user EXPLICITLY confirmed this action?
- [ ] Is there a safer alternative?

### 🎯 EXAMPLES:

#### ❌ WRONG (Dangerous without protection):
```bash
# NEVER DO THIS:
psql ... -c "DROP SCHEMA public CASCADE"
npx prisma migrate reset --force
```

#### ✅ CORRECT (Protected):
```javascript
// Do this instead:
const { requirePasswordForDatabaseOperation } = require('./prisma/REQUIRE_PASSWORD_FOR_DB_OPERATIONS');

const allowed = await requirePasswordForDatabaseOperation('DROP SCHEMA public CASCADE');
if (!allowed) {
  process.exit(1);
}

// Only now execute the operation
execSync('psql ... -c "DROP SCHEMA public CASCADE"');
```

---

## 📞 EMERGENCY RESTORE PROCEDURE:

If data was accidentally deleted:

1. Check production database connection
2. Use `prisma/copy-local-lotg-to-prod.js` (in reverse)
3. Pull questions from production:
   ```bash
   PROD_DATABASE_URL="postgresql://..." node prisma/restore-from-production.js
   ```

---

## 🎓 REMEMBER:

> **"With great power comes great responsibility"**
> 
> Database operations are PERMANENT. Production data represents hours of work.
> ALWAYS protect it. ALWAYS require confirmation. ALWAYS use the password system.

---

**Last Updated:** December 18, 2025
**Password:** `Howdoyoud1!`
**Status:** 🟢 ACTIVE AND ENFORCED
