#!/usr/bin/env node
/**
 * BACKUP TAG SYSTEM
 * 
 * Run this before making major changes:
 *   node scripts/backup-tags.js
 * 
 * Creates a JSON backup of all tags in ./backups/tags-YYYY-MM-DD.json
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function backup() {
  console.log('💾 Creating tag backup...\n');

  const tags = await prisma.tag.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }]
  });

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `tags-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(tags, null, 2));

  console.log(`✅ Backup saved: ${filepath}`);
  console.log(`   ${tags.length} tags backed up\n`);
}

backup()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
