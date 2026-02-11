// Seed script: creates 15 PUBLIC video tests and 15 USER video tests
// Usage: node prisma/seed-video-tests.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PUBLIC_NAMES = [
  "Penalty Area Decisions",
  "Offside Fundamentals",
  "Handball Scenarios",
  "Foul Recognition Basics",
  "Advantage Application",
  "Corner Kick Procedures",
  "Free Kick Positioning",
  "Substitution Protocol",
  "Goal / No Goal",
  "Throw-in Decisions",
  "Dangerous Play Identification",
  "Simulation Detection",
  "Goalkeeper Infractions",
  "Offside Advanced",
  "Disciplinary Sanctions Mix",
];

const USER_NAMES = [
  "My Penalty Practice",
  "Quick Offside Drill",
  "Handball Challenge",
  "Foul or No Foul",
  "Advantage Scenarios",
  "Set Piece Review",
  "Positioning Test",
  "Match Prep Week 1",
  "Match Prep Week 2",
  "Difficult Decisions",
  "Red Card Situations",
  "Yellow Card Border Cases",
  "VAR Review Practice",
  "Restarts Quiz",
  "Full Match Simulation",
];

async function main() {
  // Find the first user to assign as creator of USER tests
  const user = await prisma.user.findFirst({ where: { role: "REFEREE" } });
  const adminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  const creatorId = user?.id ?? adminUser?.id;

  if (!creatorId) {
    console.error("No user found in the database. Please create a user first.");
    process.exit(1);
  }

  // Get all active video clips
  const clips = await prisma.videoClip.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (clips.length === 0) {
    console.error("No active video clips found. Seed video clips first.");
    process.exit(1);
  }

  console.log(`Found ${clips.length} active clips and user ${creatorId}`);

  // Helper: pick N random clips
  function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }

  // Delete any existing seeded tests (optional — prevents duplicates on re-run)
  const existingPublic = await prisma.videoTest.findMany({
    where: { type: "PUBLIC", name: { in: PUBLIC_NAMES } },
    select: { id: true },
  });
  const existingUser = await prisma.videoTest.findMany({
    where: { type: "USER", name: { in: USER_NAMES }, createdById: creatorId },
    select: { id: true },
  });
  const idsToDelete = [...existingPublic, ...existingUser].map((t) => t.id);
  if (idsToDelete.length > 0) {
    await prisma.videoTest.deleteMany({ where: { id: { in: idsToDelete } } });
    console.log(`Cleaned up ${idsToDelete.length} existing seeded tests`);
  }

  // Create PUBLIC tests
  for (const name of PUBLIC_NAMES) {
    const totalClips = 5 + Math.floor(Math.random() * 11); // 5-15
    const chosen = pickRandom(clips, totalClips);
    const test = await prisma.videoTest.create({
      data: {
        name,
        description: `Practice test: ${name.toLowerCase()}`,
        type: "PUBLIC",
        totalClips: chosen.length,
        passingScore: [60, 70, 75, 80, null][Math.floor(Math.random() * 5)],
        isActive: true,
        clips: {
          create: chosen.map((c, i) => ({
            videoClipId: c.id,
            order: i,
          })),
        },
      },
    });
    console.log(`Created PUBLIC test: ${test.name} (${chosen.length} clips)`);
  }

  // Create USER tests
  for (const name of USER_NAMES) {
    const totalClips = 5 + Math.floor(Math.random() * 11); // 5-15
    const chosen = pickRandom(clips, totalClips);
    const test = await prisma.videoTest.create({
      data: {
        name,
        type: "USER",
        totalClips: chosen.length,
        isActive: true,
        createdById: creatorId,
        clips: {
          create: chosen.map((c, i) => ({
            videoClipId: c.id,
            order: i,
          })),
        },
      },
    });
    console.log(`Created USER test: ${test.name} (${chosen.length} clips)`);
  }

  console.log("\nDone! Created 15 PUBLIC + 15 USER video tests.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
