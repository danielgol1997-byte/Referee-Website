/**
 * Seed Demo Videos
 * Creates sample videos to demonstrate the video library
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Seeding demo videos...');

  // Get the first super admin user (or create one if needed)
  let superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (!superAdmin) {
    console.log('Creating super admin user for demo...');
    superAdmin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Demo Admin',
        role: 'SUPER_ADMIN',
      }
    });
  }

  // Get the main library category (required field)
  let libraryCategory = await prisma.category.findFirst({
    where: { type: 'LIBRARY' }
  });

  if (!libraryCategory) {
    libraryCategory = await prisma.category.create({
      data: {
        name: 'Video Library',
        slug: 'video-library',
        type: 'LIBRARY',
        description: 'Educational video content'
      }
    });
  }

  // Get video categories (new hierarchical system)
  const handbballCategory = await prisma.videoCategory.findUnique({
    where: { slug: 'handball' }
  });

  const offsideCategory = await prisma.videoCategory.findUnique({
    where: { slug: 'offside' }
  });

  const dogsoCategory = await prisma.videoCategory.findUnique({
    where: { slug: 'red-cards-dogso' }
  });

  // Get tags
  const handbllTag = await prisma.tag.findUnique({
    where: { slug: 'handball' }
  });

  const penaltyAreaTag = await prisma.tag.findUnique({
    where: { slug: 'penalty-area' }
  });

  const dogoTag = await prisma.tag.findUnique({
    where: { slug: 'dogso' }
  });

  // Demo videos
  const demoVideos = [
    {
      title: 'Handball in Penalty Area - Deliberate Contact',
      description: 'Attacking player shoots from edge of penalty area. Ball strikes defending player\'s outstretched arm which is clearly above shoulder height, making the body unnaturally bigger.',
      fileUrl: '/videos/demo/handball-pa-1.mp4',
      thumbnailUrl: '/videos/demo/thumbnails/handball-pa-1.jpg',
      duration: 105, // 1:45
      videoType: 'MATCH_CLIP',
      categoryId: libraryCategory.id, // Required old category field
      videoCategoryId: handbballCategory?.id,
      correctDecision: 'Penalty Kick + Yellow Card',
      decisionExplanation: 'The defender\'s arm is clearly extended above shoulder height, making their body unnaturally bigger. The contact with the ball is deliberate and prevents a shot on goal. This meets the criteria for handball under Law 12. The yellow card is issued for Stopping a Promising Attack (SPA).',
      keyPoints: [
        'Arm position: Extended above shoulder height',
        'Making body unnaturally bigger',
        'Deliberate action towards the ball',
        'No attempt to withdraw the arm',
        'Ball was heading towards goal'
      ],
      commonMistakes: [
        'Ignoring arm position above shoulder',
        'Only considering ball-to-hand vs hand-to-ball',
        'Misjudging distance from the kick',
        'Not considering if body is made unnaturally bigger'
      ],
      lawNumbers: [12],
      sanctionType: 'YELLOW_CARD',
      restartType: 'PENALTY_KICK',
      varRelevant: true,
      varNotes: 'This is a VAR reviewable incident (penalty kick decision). VAR would check for clear and obvious error in the handball decision and any potential red card for DOGSO.',
      isActive: true,
      isFeatured: true,
      order: 1,
      uploadedById: superAdmin.id,
      viewCount: 342,
    },
    {
      title: 'Offside - Active Interference with Play',
      description: 'Forward player in offside position receives through ball. Question: Is the player actively interfering with play or just in an offside position?',
      fileUrl: '/videos/demo/offside-active-1.mp4',
      thumbnailUrl: '/videos/demo/thumbnails/offside-active-1.jpg',
      duration: 130, // 2:10
      videoType: 'MATCH_CLIP',
      categoryId: libraryCategory.id,
      videoCategoryId: offsideCategory?.id,
      correctDecision: 'Offside - Indirect Free Kick',
      decisionExplanation: 'The attacking player is in an offside position when the ball is played and becomes actively involved by playing or touching the ball passed by a teammate. This is a clear offside offense.',
      keyPoints: [
        'Player was in offside position when ball was played',
        'Player actively plays/touches the ball',
        'No defender between player and goal',
        'Clear interference with play'
      ],
      commonMistakes: [
        'Waiting too long to make the call',
        'Not checking if player touches the ball',
        'Confusion about passive vs active offside',
        'Missing the moment ball was played by teammate'
      ],
      lawNumbers: [11],
      sanctionType: 'NO_CARD',
      restartType: 'INDIRECT_FREE_KICK',
      varRelevant: true,
      varNotes: 'VAR can review offside decisions that lead to a goal or penalty kick incident.',
      isActive: true,
      isFeatured: true,
      order: 2,
      uploadedById: superAdmin.id,
      viewCount: 287,
    },
    {
      title: 'DOGSO - Last Defender Foul',
      description: 'Attacker running through on goal is fouled by the last defender outside the penalty area. Clear goal-scoring opportunity denied.',
      fileUrl: '/videos/demo/dogso-1.mp4',
      thumbnailUrl: '/videos/demo/thumbnails/dogso-1.jpg',
      duration: 95, // 1:35
      videoType: 'MATCH_CLIP',
      categoryId: libraryCategory.id,
      videoCategoryId: dogsoCategory?.id,
      correctDecision: 'Direct Free Kick + Red Card (DOGSO)',
      decisionExplanation: 'This is a clear Denying an Obvious Goal-Scoring Opportunity (DOGSO). All four criteria are met: 1) Direction of play towards goal, 2) Likelihood of keeping/gaining control, 3) Location and number of defenders, 4) Distance to goal. Red card is mandatory.',
      keyPoints: [
        'Clear direction towards opponents\' goal',
        'Attacker had control of the ball',
        'No defenders between player and goal',
        'Close enough to score (DOGSO distance)',
        'Foul denies the opportunity'
      ],
      commonMistakes: [
        'Showing yellow instead of red',
        'Not considering all four DOGSO criteria',
        'Misjudging the likelihood of control',
        'Thinking covering defender was close enough'
      ],
      lawNumbers: [12],
      sanctionType: 'RED_CARD',
      restartType: 'DIRECT_FREE_KICK',
      varRelevant: true,
      varNotes: 'VAR can review potential red card decisions. This would be checked to confirm all DOGSO criteria are met.',
      isActive: true,
      isFeatured: false,
      order: 3,
      uploadedById: superAdmin.id,
      viewCount: 412,
    },
  ];

  // Create videos
  for (const videoData of demoVideos) {
    if (!videoData.videoCategoryId) {
      console.log(`⚠️  Skipping video "${videoData.title}" - category not found`);
      continue;
    }

    const video = await prisma.videoClip.create({
      data: videoData
    });

    console.log(`✅ Created video: ${video.title}`);

    // Add tags if available
    const tagsToAdd = [];
    if (video.title.includes('Handball') && handbllTag) {
      tagsToAdd.push(handbllTag.id);
    }
    if (video.title.includes('Penalty Area') && penaltyAreaTag) {
      tagsToAdd.push(penaltyAreaTag.id);
    }
    if (video.title.includes('DOGSO') && dogoTag) {
      tagsToAdd.push(dogoTag.id);
    }

    for (const tagId of tagsToAdd) {
      await prisma.videoTag.create({
        data: {
          videoId: video.id,
          tagId: tagId,
        }
      });
    }
  }

  console.log('\n✨ Demo videos seeded successfully!');
  console.log('\n📝 Note: Video files don\'t exist yet. Add actual video files to:');
  console.log('   - /public/videos/demo/');
  console.log('   - /public/videos/demo/thumbnails/');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo videos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
