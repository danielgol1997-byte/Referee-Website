const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Decision Types for grouping CRITERIA tags
const DECISION_TYPES = [
  { name: 'Challenges', slug: 'challenges', color: '#FF6B6B', order: 1 },
  { name: 'Handball', slug: 'handball', color: '#4ECDC4', order: 2 },
  { name: 'Offside', slug: 'offside', color: '#1BC47D', order: 3 },
  { name: 'DOGSO', slug: 'dogso', color: '#FF4D6D', order: 4 },
  { name: 'SPA', slug: 'spa', color: '#FFB347', order: 5 },
];

// Map existing criteria tags to their decision types
const CRITERIA_TO_DECISION_TYPE = {
  'Careless': 'Challenges',
  'Careless challenge': 'Challenges',
  'Reckless': 'Challenges',
  'Reckless challenge': 'Challenges',
  'Violent Conduct': 'Challenges',
  'Excessive Force': 'Challenges',
  'Endangering Safety Of Opponent': 'Challenges',
  'Illegal Use Of Arms': 'Challenges',
  
  'Hand/Arm Moves Towards The Ball': 'Handball',
  'Hand /arm moves towards the ball': 'Handball',
  'Hand/arm moves towards the ball': 'Handball',
  'Hand/Arm Supports Body But Not Extended': 'Handball',
  'Hand /arm supports the body, but not extended': 'Handball',
  'Hand/arm supports the body but not extended': 'Handball',
  'Hand/Arm Not Extended': 'Handball',
  'Hand/arm not extended': 'Handball',
  'Ball Movement Towards Hand/Arm': 'Handball',
  'Ball Coming From Short Distance': 'Handball',
  'Ball coming from a short distance / Unexpected ball': 'Handball',
  'Unexpected Ball': 'Handball',
  'Distance Not Short / Ball Not Unexpected': 'Handball',
  'Player Tries To Avoid Hand Contact': 'Handball',
  'Player tries to avoid hand contact with the ball': 'Handball',
  'Player Does Not Try To Avoid Hand Contact': 'Handball',
  'Player does not try to avoid hand contact with the ball': 'Handball',
  'Player Unable To Avoid Hand Contact': 'Handball',
  'Player unable to avoid hand contact with the ball': 'Handball',
  'Attacker Gains Possession After Touching With Hand/Arm': 'Handball',
  
  'Interfering With Play': 'Offside',
  'Interfering with play by touching / playing the ball passed or touched by teammate': 'Offside',
  'Interfering With An Opponent': 'Offside',
  'Interfering with an opponent by': 'Offside',
  'Gaining An Advantage': 'Offside',
  'Not Interfering With Play': 'Offside',
  'Not Interfering With An Opponent': 'Offside',
  'Challenging Opponent For The Ball': 'Offside',
  'Challenging opponent for the ball': 'Offside',
  'Not Challenging Opponent For The Ball': 'Offside',
  'Making Obvious Action': 'Offside',
  'Not Making Obvious Action': 'Offside',
  'Clear Impact On Ability Of Opponent To Play The Ball': 'Offside',
  'No Clear Impact On Opponent': 'Offside',
  'Clearly Obstructing Opponent\'s Line Of Vision': 'Offside',
  'Not Clearly Obstructing Opponent\'s Line Of Vision': 'Offside',
  'Ball Deliberately Saved By Opponent': 'Offside',
  'Ball Rebounds/Deflects Off Opponent': 'Offside',
  'Ball rebounds/deflects off opponent': 'Offside',
  'Ball rebounds / deflects of opponent or crossbar or goalpost': 'Offside',
  'Ball Rebounds/Deflects Off Crossbar': 'Offside',
  'Ball rebounds/deflects off crossbar': 'Offside',
  'Touching/Playing Ball Passed By Teammate': 'Offside',
  
  'DOGSO While Attempting To Play The Ball': 'DOGSO',
  'DOGSO while attempting to play the ball': 'DOGSO',
  'DOGSO Whilst Not Attempting To Play The Ball': 'DOGSO',
  'DOGSO whilst not attempting to play the ball': 'DOGSO',
  'Denying A Goal Or Obvious Goal-Scoring Opportunity': 'DOGSO',
  'Clearly Attempting To Play The Ball': 'DOGSO',
  'Not Clearly Attempting To Play The Ball': 'DOGSO',
  
  'Promising Attack Stopped While Attempting To Play The Ball': 'SPA',
  'Stopping A Promising Attack While Not Attempting To Play The Ball': 'SPA',
  'No Promising Attack Stopped': 'SPA',
  'No Reckless Challenge': 'SPA',
  'No Serious Foul Play': 'SPA',
};

async function seedDecisionTypes() {
  console.log('🌱 Seeding Decision Types...\n');

  // Create decision types
  for (const dt of DECISION_TYPES) {
    const decisionType = await prisma.decisionType.upsert({
      where: { slug: dt.slug },
      update: {
        name: dt.name,
        color: dt.color,
        order: dt.order,
        isActive: true,
      },
      create: {
        name: dt.name,
        slug: dt.slug,
        color: dt.color,
        order: dt.order,
        isActive: true,
      },
    });
    console.log(`✅ Decision Type: ${decisionType.name} (${decisionType.color})`);
  }

  console.log('\n📝 Updating CRITERIA tags with decision types...\n');

  // Update existing CRITERIA tags with their decision types
  let updatedCount = 0;
  let skippedCount = 0;

  const criteriaTags = await prisma.tag.findMany({
    where: { category: 'CRITERIA' },
  });

  for (const tag of criteriaTags) {
    const decisionTypeName = CRITERIA_TO_DECISION_TYPE[tag.name];
    
    if (decisionTypeName) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { parentCategory: decisionTypeName },
      });
      console.log(`   ✅ ${tag.name} → ${decisionTypeName}`);
      updatedCount++;
    } else {
      console.log(`   ⏭️  ${tag.name} → (no decision type)`);
      skippedCount++;
    }
  }

  console.log(`\n✨ Complete! Updated ${updatedCount} criteria tags, ${skippedCount} without decision type.`);
  
  // Show summary
  const summary = await prisma.tag.groupBy({
    by: ['category', 'parentCategory'],
    _count: true,
    where: { category: 'CRITERIA' },
    orderBy: {
      parentCategory: 'asc',
    },
  });

  console.log('\n📊 Criteria Tags by Decision Type:');
  for (const group of summary) {
    console.log(`   ${group.parentCategory || '(None)'}: ${group._count} tags`);
  }
}

seedDecisionTypes()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
