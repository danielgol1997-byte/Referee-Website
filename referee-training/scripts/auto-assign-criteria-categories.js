const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping criteria tag names/keywords to categories
const CRITERIA_MAPPINGS = {
  'Challenges': [
    'careless', 'reckless', 'excessive force', 'challenge', 'tackles', 'jumping',
    'charging', 'pushing', 'striking', 'kicking', 'tripping'
  ],
  'DOGSO': [
    'dogso', 'denying an obvious goal', 'clear goal-scoring opportunity',
    'direction of play', 'distance to goal', 'defenders', 'distance between offence and ball',
    'control of the ball', 'likelihood', 'location and number of defenders'
  ],
  'SPA': [
    'spa', 'stopping a promising attack', 'interfering with or stopping',
    'pulls or holds', 'impedes the opponent', 'opponents moving away from opponents goal'
  ],
  'Handball': [
    'handball', 'hand', 'arm', 'hand/arm', 'deliberately handles',
    'unnatural position', 'body bigger', 'makes the body bigger',
    'towards the ball', 'extended', 'fall', 'protect', 'tries to avoid'
  ],
  'Holding': [
    'holding', 'pulls or holds', 'holds an opponent'
  ],
  'Illegal Use Of Arms': [
    'illegal use of arms', 'uses their arm', 'extended arm'
  ],
  'Penalty Area Decisions': [
    'penalty area', 'in the penalty area', 'inside the penalty area'
  ],
  'Simulation': [
    'simulation', 'dive', 'diving', 'exaggerating', 'feigning'
  ],
  'Advantage': [
    'advantage', 'play advantage', 'allowing play to continue'
  ],
  'Dissent': [
    'dissent', 'protests', 'complaining', 'arguing'
  ],
  'Referee Abuse': [
    'referee abuse', 'abusive', 'insulting', 'offensive'
  ],
  'Offside': [
    'offside', 'interfering with play', 'interfering with an opponent',
    'gaining an advantage', 'offside position', 'nearer to opponents goal line',
    'receives the ball', 'deflection', 'save', 'deliberate play'
  ],
  'Teamwork': [
    'teamwork', 'communication', 'positioning', 'cooperation'
  ],
  'Laws Of The Game': [
    'law', 'laws of the game', 'lotg', 'ifab'
  ]
};

async function autoAssignCategories() {
  console.log('🔄 Auto-assigning CRITERIA tags to categories...\n');

  // Get all CRITERIA tags
  const criteriaTagsToUpdate = await prisma.tag.findMany({
    where: {
      category: 'CRITERIA'
    }
  });

  console.log(`Found ${criteriaTagsToUpdate.length} CRITERIA tags\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let alreadyAssignedCount = 0;

  for (const tag of criteriaTagsToUpdate) {
    if (tag.parentCategory) {
      console.log(`⏩ Skipped: "${tag.name}" (already assigned to ${tag.parentCategory})`);
      alreadyAssignedCount++;
      continue;
    }

    const tagNameLower = tag.name.toLowerCase();
    const tagDescLower = (tag.description || '').toLowerCase();
    const searchText = `${tagNameLower} ${tagDescLower}`;

    let assignedCategory = null;
    let matchedKeyword = null;

    // Try to find a matching category
    for (const [category, keywords] of Object.entries(CRITERIA_MAPPINGS)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          assignedCategory = category;
          matchedKeyword = keyword;
          break;
        }
      }
      if (assignedCategory) break;
    }

    if (assignedCategory) {
      try {
        await prisma.tag.update({
          where: { id: tag.id },
          data: { parentCategory: assignedCategory }
        });
        console.log(`✅ "${tag.name}" → ${assignedCategory} (matched: "${matchedKeyword}")`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating "${tag.name}":`, error.message);
      }
    } else {
      console.log(`❓ No match: "${tag.name}"`);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏩ Already assigned: ${alreadyAssignedCount}`);
  console.log(`   ❓ No match found: ${skippedCount}`);
  console.log('='.repeat(60));
}

autoAssignCategories()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
