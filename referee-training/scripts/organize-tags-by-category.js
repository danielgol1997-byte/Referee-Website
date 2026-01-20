/**
 * Organize tags into new category structure
 * This script reorganizes existing tags and creates missing ones
 */

const { PrismaClient, TagCategory } = require('@prisma/client');

const prisma = new PrismaClient();

// Category tags (offence types)
const CATEGORY_TAGS = [
  { name: 'Challenges', slug: 'challenges', color: '#FF6B6B', order: 1 },
  { name: 'DOGSO', slug: 'dogso', color: '#FF4D6D', order: 2 },
  { name: 'SPA', slug: 'spa', color: '#FFB347', order: 3 },
  { name: 'Handball', slug: 'handball', color: '#4ECDC4', order: 4 },
  { name: 'Holding', slug: 'holding', color: '#95E1D3', order: 5 },
  { name: 'Illegal Use Of Arms', slug: 'illegal-use-of-arms', color: '#C44569', order: 6 },
  { name: 'Penalty Area Decisions', slug: 'penalty-area-decisions', color: '#A8E6CF', order: 7 },
  { name: 'Simulation', slug: 'simulation', color: '#FFDAC1', order: 8 },
  { name: 'Advantage', slug: 'advantage', color: '#B5EAD7', order: 9 },
  { name: 'Dissent', slug: 'dissent', color: '#C7CEEA', order: 10 },
  { name: 'Referee Abuse', slug: 'referee-abuse', color: '#F5B400', order: 11 },
  { name: 'Offside', slug: 'offside', color: '#1BC47D', order: 12 },
  { name: 'Teamwork', slug: 'teamwork', color: '#FF4D6D', order: 13 },
  { name: 'Laws Of The Game', slug: 'laws-of-the-game', color: '#00E8F8', order: 14 },
];

// Restart tags
const RESTART_TAGS = [
  { name: 'Direct Free Kick', slug: 'direct-free-kick', color: '#00E8F8', order: 1 },
  { name: 'Indirect Free Kick', slug: 'indirect-free-kick', color: '#00E8F8', order: 2 },
  { name: 'Penalty Kick', slug: 'penalty-kick', color: '#00E8F8', order: 3 },
  { name: 'Dropped Ball', slug: 'dropped-ball', color: '#00E8F8', order: 4 },
  { name: 'Corner Kick', slug: 'corner-kick', color: '#00E8F8', order: 5 },
  { name: 'Goal Kick', slug: 'goal-kick', color: '#00E8F8', order: 6 },
  { name: 'Throw-In', slug: 'throw-in', color: '#00E8F8', order: 7 },
  { name: 'Kick-Off', slug: 'kick-off', color: '#00E8F8', order: 8 },
];

// Criteria tags - mapped to their parent categories
const CRITERIA_TAGS = [
  // Challenges criteria
  { name: 'Careless', slug: 'careless', color: '#FF6B6B', order: 1, parentCategory: 'Challenges' },
  { name: 'Reckless', slug: 'reckless', color: '#FF6B6B', order: 2, parentCategory: 'Challenges' },
  { name: 'Serious Foul Play', slug: 'serious-foul-play', color: '#FF6B6B', order: 3, parentCategory: 'Challenges' },
  { name: 'Violent Conduct', slug: 'violent-conduct', color: '#FF6B6B', order: 4, parentCategory: 'Challenges' },
  { name: 'Excessive Force', slug: 'excessive-force', color: '#FF6B6B', order: 5, parentCategory: 'Challenges' },
  { name: 'Endangering Safety Of Opponent', slug: 'endangering-safety-of-opponent', color: '#FF6B6B', order: 6, parentCategory: 'Challenges' },
  
  // Handball criteria
  { name: 'Hand/Arm Moves Towards The Ball', slug: 'hand-arm-moves-towards-ball', color: '#4ECDC4', order: 10, parentCategory: 'Handball' },
  { name: 'Hand/Arm Supports Body But Not Extended', slug: 'hand-arm-supports-body-not-extended', color: '#4ECDC4', order: 11, parentCategory: 'Handball' },
  { name: 'Hand/Arm Not Extended', slug: 'hand-arm-not-extended', color: '#4ECDC4', order: 12, parentCategory: 'Handball' },
  { name: 'Ball Movement Towards Hand/Arm', slug: 'ball-movement-towards-hand-arm', color: '#4ECDC4', order: 13, parentCategory: 'Handball' },
  { name: 'Ball Coming From Short Distance', slug: 'ball-coming-from-short-distance', color: '#4ECDC4', order: 14, parentCategory: 'Handball' },
  { name: 'Unexpected Ball', slug: 'unexpected-ball', color: '#4ECDC4', order: 15, parentCategory: 'Handball' },
  { name: 'Distance Not Short / Ball Not Unexpected', slug: 'distance-not-short-ball-not-unexpected', color: '#4ECDC4', order: 16, parentCategory: 'Handball' },
  { name: 'Player Tries To Avoid Hand Contact', slug: 'player-tries-to-avoid-hand-contact', color: '#4ECDC4', order: 17, parentCategory: 'Handball' },
  { name: 'Player Does Not Try To Avoid Hand Contact', slug: 'player-does-not-try-to-avoid-hand-contact', color: '#4ECDC4', order: 18, parentCategory: 'Handball' },
  { name: 'Player Unable To Avoid Hand Contact', slug: 'player-unable-to-avoid-hand-contact', color: '#4ECDC4', order: 19, parentCategory: 'Handball' },
  { name: 'Attacker Gains Possession After Touching With Hand/Arm', slug: 'attacker-gains-possession-after-hand-arm', color: '#4ECDC4', order: 20, parentCategory: 'Handball' },
  
  // Offside criteria
  { name: 'Interfering With Play', slug: 'interfering-with-play', color: '#1BC47D', order: 30, parentCategory: 'Offside' },
  { name: 'Interfering With An Opponent', slug: 'interfering-with-an-opponent', color: '#1BC47D', order: 31, parentCategory: 'Offside' },
  { name: 'Gaining An Advantage', slug: 'gaining-an-advantage', color: '#1BC47D', order: 32, parentCategory: 'Offside' },
  { name: 'Not Interfering With Play', slug: 'not-interfering-with-play', color: '#1BC47D', order: 33, parentCategory: 'Offside' },
  { name: 'Not Interfering With An Opponent', slug: 'not-interfering-with-an-opponent', color: '#1BC47D', order: 34, parentCategory: 'Offside' },
  { name: 'Challenging Opponent For The Ball', slug: 'challenging-opponent-for-ball', color: '#1BC47D', order: 35, parentCategory: 'Offside' },
  { name: 'Not Challenging Opponent For The Ball', slug: 'not-challenging-opponent-for-ball', color: '#1BC47D', order: 36, parentCategory: 'Offside' },
  { name: 'Making Obvious Action', slug: 'making-obvious-action', color: '#1BC47D', order: 37, parentCategory: 'Offside' },
  { name: 'Not Making Obvious Action', slug: 'not-making-obvious-action', color: '#1BC47D', order: 38, parentCategory: 'Offside' },
  { name: 'Clear Impact On Ability Of Opponent To Play The Ball', slug: 'clear-impact-on-opponent-ability', color: '#1BC47D', order: 39, parentCategory: 'Offside' },
  { name: 'No Clear Impact On Opponent', slug: 'no-clear-impact-on-opponent', color: '#1BC47D', order: 40, parentCategory: 'Offside' },
  { name: 'Clearly Obstructing Opponent\'s Line Of Vision', slug: 'clearly-obstructing-opponent-line-of-vision', color: '#1BC47D', order: 41, parentCategory: 'Offside' },
  { name: 'Not Clearly Obstructing Opponent\'s Line Of Vision', slug: 'not-clearly-obstructing-opponent-line-of-vision', color: '#1BC47D', order: 42, parentCategory: 'Offside' },
  { name: 'Ball Deliberately Saved By Opponent', slug: 'ball-deliberately-saved-by-opponent', color: '#1BC47D', order: 43, parentCategory: 'Offside' },
  { name: 'Ball Rebounds/Deflects Off Opponent', slug: 'ball-rebounds-deflects-off-opponent', color: '#1BC47D', order: 44, parentCategory: 'Offside' },
  { name: 'Ball Rebounds/Deflects Off Crossbar', slug: 'ball-rebounds-deflects-off-crossbar', color: '#1BC47D', order: 45, parentCategory: 'Offside' },
  { name: 'Touching/Playing Ball Passed By Teammate', slug: 'touching-playing-ball-passed-by-teammate', color: '#1BC47D', order: 46, parentCategory: 'Offside' },
  
  // DOGSO criteria
  { name: 'DOGSO While Attempting To Play The Ball', slug: 'dogso-while-attempting-to-play-ball', color: '#FF4D6D', order: 50, parentCategory: 'DOGSO' },
  { name: 'DOGSO Whilst Not Attempting To Play The Ball', slug: 'dogso-whilst-not-attempting-to-play-ball', color: '#FF4D6D', order: 51, parentCategory: 'DOGSO' },
  { name: 'Denying A Goal Or Obvious Goal-Scoring Opportunity', slug: 'denying-goal-or-obvious-goal-scoring-opportunity', color: '#FF4D6D', order: 52, parentCategory: 'DOGSO' },
  
  // SPA criteria
  { name: 'Promising Attack Stopped While Attempting To Play The Ball', slug: 'promising-attack-stopped-while-attempting', color: '#FFB347', order: 60, parentCategory: 'SPA' },
  { name: 'Stopping A Promising Attack While Not Attempting To Play The Ball', slug: 'stopping-promising-attack-while-not-attempting', color: '#FFB347', order: 61, parentCategory: 'SPA' },
  { name: 'No Promising Attack Stopped', slug: 'no-promising-attack-stopped', color: '#FFB347', order: 62, parentCategory: 'SPA' },
  { name: 'No Reckless Challenge', slug: 'no-reckless-challenge', color: '#FFB347', order: 63, parentCategory: 'SPA' },
  { name: 'No Serious Foul Play', slug: 'no-serious-foul-play', color: '#FFB347', order: 64, parentCategory: 'SPA' },
  
  // General criteria
  { name: 'No Offence', slug: 'no-offence', color: '#00E8F8', order: 100, parentCategory: null },
  { name: 'Play On', slug: 'play-on', color: '#00E8F8', order: 101, parentCategory: null },
  { name: 'Clearly Attempting To Play The Ball', slug: 'clearly-attempting-to-play-ball', color: '#00E8F8', order: 102, parentCategory: null },
  { name: 'Not Clearly Attempting To Play The Ball', slug: 'not-clearly-attempting-to-play-ball', color: '#00E8F8', order: 103, parentCategory: null },
  { name: 'Deceiving Or Attempting To Deceive The Referee', slug: 'deceiving-or-attempting-to-deceive-referee', color: '#00E8F8', order: 104, parentCategory: null },
  { name: 'No Obvious Action Intended To Deceive', slug: 'no-obvious-action-intended-to-deceive', color: '#00E8F8', order: 105, parentCategory: null },
];

// Sanction tags
const SANCTION_TAGS = [
  { name: 'Yellow Card', slug: 'yellow-card', color: '#F5B400', order: 1 },
  { name: 'Red Card', slug: 'red-card', color: '#FF4D6D', order: 2 },
  { name: 'No Disciplinary Sanction Needed', slug: 'no-disciplinary-sanction-needed', color: '#1BC47D', order: 3 },
  { name: 'Verbal Warning', slug: 'verbal-warning', color: '#00E8F8', order: 4 },
];

// Scenario tags
const SCENARIO_TAGS = [
  { name: 'Penalty', slug: 'penalty-scenario', color: '#A8E6CF', order: 1 },
  { name: 'Free Kick', slug: 'free-kick-scenario', color: '#A8E6CF', order: 2 },
  { name: 'Kick Off', slug: 'kick-off-scenario', color: '#A8E6CF', order: 3 },
  { name: 'During Play', slug: 'during-play', color: '#A8E6CF', order: 4 },
  { name: 'Throw In', slug: 'throw-in-scenario', color: '#A8E6CF', order: 5 },
  { name: 'Corner Kick Scenario', slug: 'corner-kick-scenario', color: '#A8E6CF', order: 6 },
  { name: 'Goal Kick Scenario', slug: 'goal-kick-scenario', color: '#A8E6CF', order: 7 },
  { name: 'Dropped Ball Scenario', slug: 'dropped-ball-scenario', color: '#A8E6CF', order: 8 },
];

async function createOrUpdateTag(tagData, category) {
  try {
    const tag = await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: {
        name: tagData.name,
        category,
        color: tagData.color,
        order: tagData.order,
        isActive: true,
      },
      create: {
        name: tagData.name,
        slug: tagData.slug,
        category,
        color: tagData.color,
        order: tagData.order,
        isActive: true,
      },
    });
    return tag;
  } catch (error) {
    console.error(`Error with tag "${tagData.name}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🏷️  Organizing tags into new category structure...\n');

  // Create Category tags
  console.log('📁 Creating Category tags...');
  for (const tag of CATEGORY_TAGS) {
    await createOrUpdateTag(tag, TagCategory.CATEGORY);
    console.log(`  ✅ ${tag.name}`);
  }

  // Create Restart tags
  console.log('\n🔄 Creating Restart tags...');
  for (const tag of RESTART_TAGS) {
    await createOrUpdateTag(tag, TagCategory.RESTARTS);
    console.log(`  ✅ ${tag.name}`);
  }

  // Create Criteria tags
  console.log('\n📋 Creating Criteria tags...');
  for (const tag of CRITERIA_TAGS) {
    await createOrUpdateTag(tag, TagCategory.CRITERIA);
    console.log(`  ✅ ${tag.name}${tag.parentCategory ? ` (${tag.parentCategory})` : ''}`);
  }

  // Create Sanction tags
  console.log('\n⚖️  Creating Sanction tags...');
  for (const tag of SANCTION_TAGS) {
    await createOrUpdateTag(tag, TagCategory.SANCTION);
    console.log(`  ✅ ${tag.name}`);
  }

  // Create Scenario tags
  console.log('\n🎬 Creating Scenario tags...');
  for (const tag of SCENARIO_TAGS) {
    await createOrUpdateTag(tag, TagCategory.SCENARIO);
    console.log(`  ✅ ${tag.name}`);
  }

  console.log('\n✨ Tag organization complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
