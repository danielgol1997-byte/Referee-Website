const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Keep these as the canonical versions (better formatting, clearer names)
const KEEP_TAGS = [
  'Active involvement in play',
  'Ball Deliberately Saved By Opponent',
  'Ball Rebounds/Deflects Off Crossbar',
  'Ball Rebounds/Deflects Off Opponent',
  'Challenging Opponent For The Ball',
  'Clear Impact On Ability Of Opponent To Play The Ball',
  'Clearly Obstructing Opponent\'s Line Of Vision',
  'Interfering With An Opponent',
  'Interfering With Play',
  'Making Obvious Action',
  'No Clear Impact On Opponent',
  'Not Challenging Opponent For The Ball',
  'Not Clearly Obstructing Opponent\'s Line Of Vision',
  'Not Interfering With An Opponent',
  'Not Interfering With Play',
  'Not Making Obvious Action',
  'Not in offside position',
  'Offside', // The CATEGORY tag
  'Touching/Playing Ball Passed By Teammate',
];

// Tags to delete (duplicates with worse formatting or merged concepts)
const DELETE_SLUGS = [
  'ball-rebounds-deflects-of-opponent-or-crossbar-or-goalpost', // duplicate
  'ball-reboundsdeflects-off-opponent', // duplicate with typo
  'challenging-opponent-for-the-ball', // duplicate
  'clear-impact-on-ability-of-opponent-to-play-the-ball', // duplicate
  'clearly-attempting-to-play-the-ball-which-is-close-to-him-impact-on-opponent', // too specific/long
  'clearly-obstructing-opponents-line-of-vision', // duplicate
  'gaining-an-advantage-playing-the-ball-or-interfering-with-opponent-when', // too long/merged
  'interfering-with-an-opponent-by', // incomplete
  'interfering-with-play-by-touching-playing-the-ball-passed-or-touched-by-teammate', // too long/merged
  'making-obvious-action-clear-impact-on-ability-of-opponent-to-play-the-ball', // merged concept
  'not-challenging-opponent-for-the-ball', // duplicate
  'not-clearly-attempting-to-play-the-ball-which-is-close-to-him-and-or-no-impact-on-opponent', // too long
  'not-clearly-obstructing-opponents-line-of-vision', // duplicate
  'not-interfering-with-play-not-touching-the-ball', // merged
  'not-making-obvious-action-and-or-no-clear-impact-on-ability-of-opponent-to-play-the-ball', // too long/merged
  'notclearly-obstructing-opponents-line-of-vision', // typo
  'touchingplaying-the-ball-passed-by-teammate', // typo
];

async function removeDuplicates() {
  console.log('🔍 Finding duplicate offside tags...\n');

  // Get all tags to delete
  const tagsToDelete = await prisma.tag.findMany({
    where: {
      slug: { in: DELETE_SLUGS }
    },
    include: {
      _count: {
        select: { videos: true }
      }
    }
  });

  console.log(`Found ${tagsToDelete.length} duplicate tags to delete:\n`);
  
  for (const tag of tagsToDelete) {
    console.log(`- ${tag.name} (${tag.slug})`);
    console.log(`  Used in ${tag._count.videos} videos`);
    
    if (tag._count.videos > 0) {
      console.log(`  ⚠️ WARNING: This tag is used in videos!`);
    }
  }

  console.log('\n❓ Do you want to proceed with deletion?');
  console.log('This will DELETE these tags. Videos using these tags will lose the association.');
  console.log('\nTo proceed, run: node prisma/remove-offside-duplicates.js --confirm\n');

  // Check if --confirm flag is passed
  if (process.argv.includes('--confirm')) {
    console.log('🗑️ Deleting duplicate tags...\n');
    
    for (const tag of tagsToDelete) {
      try {
        // Delete VideoTag associations first
        await prisma.videoTag.deleteMany({
          where: { tagId: tag.id }
        });
        
        // Delete the tag
        await prisma.tag.delete({
          where: { id: tag.id }
        });
        
        console.log(`✅ Deleted: ${tag.name}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${tag.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Cleanup complete!\n');
    
    // Show remaining offside tags
    const remaining = await prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: 'offside', mode: 'insensitive' } },
          { parentCategory: { contains: 'Offside', mode: 'insensitive' } }
        ]
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Remaining offside tags: ${remaining.length}\n`);
    remaining.forEach(tag => {
      console.log(`- ${tag.name}`);
    });
  }

  await prisma.$disconnect();
}

removeDuplicates().catch(console.error);
