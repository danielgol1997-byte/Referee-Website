#!/usr/bin/env node
/**
 * DELETE PLACEHOLDER VIDEOS
 * 
 * Removes all demo/placeholder videos and their associated tags.
 * Run: node scripts/delete-placeholder-videos.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deletePlaceholders() {
  console.log('🗑️  Deleting placeholder videos...\n');

  // Find all videos with placeholder patterns
  const placeholderPatterns = [
    'Handball Scenario #',
    'Offside Scenario #',
    'DOGSO Scenario #',
    'Seeded demo clip',
  ];

  const libraryCategory = await prisma.category.findUnique({ 
    where: { slug: 'video-library' } 
  });

  if (!libraryCategory) {
    console.log('❌ Video library category not found. Exiting.\n');
    await prisma.$disconnect();
    return;
  }

  // Find all placeholder videos
  const placeholderVideos = await prisma.videoClip.findMany({
    where: {
      categoryId: libraryCategory.id,
      OR: [
        { title: { startsWith: 'Handball Scenario #' } },
        { title: { startsWith: 'Offside Scenario #' } },
        { title: { startsWith: 'DOGSO Scenario #' } },
        { description: { contains: 'Seeded demo clip' } },
      ],
    },
    include: {
      tags: true,
    },
  });

  console.log(`Found ${placeholderVideos.length} placeholder videos\n`);

  if (placeholderVideos.length === 0) {
    console.log('✅ No placeholder videos found.\n');
    await prisma.$disconnect();
    return;
  }

  let deletedVideos = 0;
  let deletedTags = 0;

  for (const video of placeholderVideos) {
    // Delete associated tags first
    const tagCount = video.tags.length;
    if (tagCount > 0) {
      await prisma.videoTag.deleteMany({
        where: { videoId: video.id },
      });
      deletedTags += tagCount;
    }

    // Delete the video
    await prisma.videoClip.delete({
      where: { id: video.id },
    });

    console.log(`   ✅ Deleted: ${video.title} (${tagCount} tags removed)`);
    deletedVideos++;
  }

  console.log(`\n✨ Cleanup complete:`);
  console.log(`   📹 Deleted ${deletedVideos} videos`);
  console.log(`   🏷️  Removed ${deletedTags} tag associations\n`);
}

deletePlaceholders()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
