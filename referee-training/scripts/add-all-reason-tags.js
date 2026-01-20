/**
 * Add all extracted decision reasons as tags
 */

const { PrismaClient, TagCategory } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Read extracted reasons - try multiple possible paths
const possiblePaths = [
  path.join(__dirname, 'all-extracted-reasons.txt'),
  path.join(__dirname, '../referee-training/scripts/all-extracted-reasons.txt'),
  path.join(process.cwd(), 'scripts/all-extracted-reasons.txt'),
];

let reasonsFile = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    reasonsFile = p;
    break;
  }
}

if (!reasonsFile) {
  console.error('Could not find all-extracted-reasons.txt file');
  process.exit(1);
}

const reasons = fs.readFileSync(reasonsFile, 'utf-8')
  .split('\n')
  .map(r => r.trim())
  .filter(r => r.length > 0);

function categorizeReason(reason) {
  const lower = reason.toLowerCase();
  
  // SCENARIO: Offside, interfering, gaining advantage scenarios
  if (lower.includes('offside') || 
      lower.includes('interfering') ||
      lower.includes('gaining advantage') ||
      lower.includes('touching') ||
      lower.includes('playing the ball')) {
    return TagCategory.SCENARIO;
  }
  
  // CONCEPT: Foul play, challenges, handball, DOGSO
  if (lower.includes('challenge') ||
      lower.includes('foul') ||
      lower.includes('hand') ||
      lower.includes('arm') ||
      lower.includes('dogso') ||
      lower.includes('reckless') ||
      lower.includes('careless') ||
      lower.includes('promising attack') ||
      lower.includes('goal-scoring')) {
    return TagCategory.CONCEPT;
  }
  
  // Default to CONCEPT
  return TagCategory.CONCEPT;
}

async function createTag(name, category) {
  const slug = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  try {
    // Check if tag already exists
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: name, mode: 'insensitive' } }
        ]
      }
    });
    
    if (existing) {
      console.log(`  ⏭️  "${name}" (already exists)`);
      return { created: false, tag: existing };
    }
    
    // Create new tag
    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        category,
        isActive: true,
        order: 0,
      }
    });
    
    console.log(`  ✅ "${name}" (${category})`);
    return { created: true, tag };
  } catch (error) {
    console.error(`  ❌ "${name}": ${error.message}`);
    return { created: false, tag: null };
  }
}

async function main() {
  console.log(`🏷️  Adding ${reasons.length} decision reason tags...\n`);
  
  let created = 0;
  let skipped = 0;
  
  for (const reason of reasons) {
    const category = categorizeReason(reason);
    const result = await createTag(reason, category);
    
    if (result.created) {
      created++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\n✨ Complete! Created ${created} tags, skipped ${skipped} duplicates.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
