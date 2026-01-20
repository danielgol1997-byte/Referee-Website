/**
 * Extract decision reasons from UEFA PNG images and add them as tags
 * Run with: node scripts/add-decision-reason-tags.js
 */

const { PrismaClient, TagCategory } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Decision reasons extracted from images (manually curated from OCR results)
// These are the unique reasons found in the UEFA decision images
const DECISION_REASONS = [
  // From B1.png and similar
  "No promising attack stopped",
  "No reckless challenge",
  "No serious foul play",
  
  // From C1.png and similar  
  "Hand/arm supports the body but not extended",
  "Hand/arm not extended",
  
  // Common patterns found
  "Not interfering with play",
  "Not interfering with an opponent",
  "Not clearly obstructing opponent's line of vision",
  "Not making obvious action",
  "No clear impact on opponent",
  "Not challenging opponent for the ball",
  
  // Gaining advantage scenarios
  "Gaining an advantage",
  "Ball deliberately saved by opponent",
  "Ball rebounds/deflects off opponent",
  "Ball rebounds/deflects off crossbar",
  
  // Interfering scenarios
  "Interfering with play",
  "Interfering with an opponent",
  "Challenging opponent for the ball",
  "Making obvious action",
  "Clear impact on ability of opponent to play the ball",
  "Clearly obstructing opponent's line of vision",
  "Touching/playing the ball passed by teammate",
  
  // Careless/Reckless/Violent Conduct
  "Careless challenge",
  "Reckless challenge",
  "Serious foul play",
  "Violent conduct",
  "Excessive force",
  "Endangering safety of opponent",
  
  // Offside specific
  "Not in offside position",
  "In offside position",
  "Active involvement in play",
  
  // Other common reasons
  "No offence",
  "No disciplinary sanction",
  "Play on",
];

async function createTag(name, category = TagCategory.CONCEPT) {
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
      console.log(`  ⏭️  Skipping "${name}" (already exists)`);
      return existing;
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
    
    console.log(`  ✅ Created tag: "${name}" (${category})`);
    return tag;
  } catch (error) {
    console.error(`  ❌ Error creating tag "${name}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🏷️  Adding decision reason tags to database...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const reason of DECISION_REASONS) {
    const existing = await prisma.tag.findFirst({
      where: {
        name: { equals: reason, mode: 'insensitive' }
      }
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Categorize the reason
    let category = TagCategory.CONCEPT;
    
    if (reason.toLowerCase().includes('offside') || 
        reason.toLowerCase().includes('interfering') ||
        reason.toLowerCase().includes('gaining advantage')) {
      category = TagCategory.SCENARIO;
    } else if (reason.toLowerCase().includes('careless') ||
               reason.toLowerCase().includes('reckless') ||
               reason.toLowerCase().includes('violent') ||
               reason.toLowerCase().includes('foul')) {
      category = TagCategory.CONCEPT;
    }
    
    const tag = await createTag(reason, category);
    if (tag && !tag.id.includes('existing')) {
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
