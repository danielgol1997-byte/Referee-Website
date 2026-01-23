/**
 * Migration Script: Convert hardcoded lawNumbers to tag-based system
 * 
 * This script:
 * 1. Creates a "Laws" tag category (order: 0 - first position)
 * 2. Creates 17 law tags (Law 1-17 with their official names)
 * 3. Migrates existing VideoClip.lawNumbers to VideoTag relationships
 * 4. Preserves original lawNumbers field (for rollback safety)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Official IFAB Law names (matching lib/laws.ts)
const LAW_NAMES = {
  1: "The Field of Play",
  2: "The Ball",
  3: "The Players",
  4: "The Players' Equipment",
  5: "The Referee",
  6: "The Other Match Officials",
  7: "The Duration of the Match",
  8: "The Start and Restart of Play",
  9: "The Ball in and Out of Play",
  10: "Determining the Outcome of a Match",
  11: "Offside",
  12: "Fouls and Misconduct",
  13: "Free Kicks",
  14: "The Penalty Kick",
  15: "The Throw-in",
  16: "The Goal Kick",
  17: "The Corner Kick",
};

const LAW_COLOR = '#9B72CB'; // Purple color used in video upload form

async function main() {
  console.log('🚀 Starting Laws to Tags Migration...\n');

  // Step 1: Create "Laws" tag category (order: 0 for first position)
  console.log('📦 Step 1: Creating "Laws" tag category...');
  let lawsCategory = await prisma.tagCategory.findFirst({
    where: { slug: 'laws' }
  });

  if (lawsCategory) {
    console.log('✅ "Laws" category already exists:', lawsCategory.name);
  } else {
    lawsCategory = await prisma.tagCategory.create({
      data: {
        name: 'Laws',
        slug: 'laws',
        description: 'Laws of the Game (IFAB)',
        canBeCorrectAnswer: false, // Laws are metadata filters, not decision answers
        order: 0, // First position (before Category, Criteria, etc.)
        isActive: true,
      }
    });
    console.log('✅ Created "Laws" category:', lawsCategory.name);
  }

  // Step 2: Create 17 law tags
  console.log('\n📝 Step 2: Creating law tags (1-17)...');
  const lawTags = [];
  
  for (let lawNum = 1; lawNum <= 17; lawNum++) {
    const lawName = LAW_NAMES[lawNum];
    const tagName = `Law ${lawNum} - ${lawName}`;
    const tagSlug = `law-${lawNum}`;
    
    let tag = await prisma.tag.findFirst({
      where: { 
        slug: tagSlug,
        categoryId: lawsCategory.id
      }
    });

    if (tag) {
      console.log(`  ✓ Law ${lawNum} already exists`);
      lawTags.push(tag);
    } else {
      tag = await prisma.tag.create({
        data: {
          name: tagName,
          slug: tagSlug,
          categoryId: lawsCategory.id,
          color: LAW_COLOR,
          description: lawName,
          isActive: true,
          order: lawNum,
          parentCategory: null,
        }
      });
      console.log(`  ✅ Created: ${tagName}`);
      lawTags.push(tag);
    }
  }

  console.log(`\n✅ All ${lawTags.length} law tags ready`);

  // Step 3: Migrate VideoClip.lawNumbers to VideoTag relationships
  console.log('\n🎬 Step 3: Migrating video law numbers to tags...');
  
  const videos = await prisma.videoClip.findMany({
    where: {
      lawNumbers: { isEmpty: false } // Only videos with law numbers
    },
    select: {
      id: true,
      title: true,
      lawNumbers: true,
    }
  });

  console.log(`Found ${videos.length} videos with law numbers\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const video of videos) {
    console.log(`Processing: "${video.title.substring(0, 50)}..."`);
    console.log(`  Law numbers: [${video.lawNumbers.join(', ')}]`);

    for (const lawNum of video.lawNumbers) {
      const lawTag = lawTags.find(t => t.order === lawNum);
      
      if (!lawTag) {
        console.warn(`  ⚠️  No tag found for Law ${lawNum} - skipping`);
        continue;
      }

      // Check if VideoTag already exists
      const existing = await prisma.videoTag.findUnique({
        where: {
          videoId_tagId: {
            videoId: video.id,
            tagId: lawTag.id
          }
        }
      });

      if (existing) {
        console.log(`  ↔️  Law ${lawNum} tag already linked`);
        skippedCount++;
      } else {
        await prisma.videoTag.create({
          data: {
            video: { connect: { id: video.id } },
            tag: { connect: { id: lawTag.id } },
            isCorrectDecision: false, // Laws are filters, not answers
            decisionOrder: 0,
          }
        });
        console.log(`  ✅ Linked Law ${lawNum} tag`);
        migratedCount++;
      }
    }
    console.log('');
  }

  console.log('\n📊 Migration Summary:');
  console.log(`  Videos processed: ${videos.length}`);
  console.log(`  Tags created: ${migratedCount}`);
  console.log(`  Tags skipped (already exist): ${skippedCount}`);
  console.log('\n✅ Migration complete!');
  console.log('\n💡 Note: Original lawNumbers fields preserved for rollback safety');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
