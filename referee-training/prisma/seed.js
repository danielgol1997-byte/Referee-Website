/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, AssignmentStatus, CategoryType, QuestionType, Role } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function createUsers() {
  const password = await hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "referee@example.com" },
    update: {},
    create: {
      email: "referee@example.com",
      name: "Referee User",
      password,
      role: Role.REFEREE,
      country: "Denmark",
      authProvider: "credentials",
      profileComplete: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Analytics Admin",
      password,
      role: Role.ADMIN,
      country: "Germany",
      authProvider: "credentials",
      profileComplete: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "super@example.com" },
    update: {},
    create: {
      email: "super@example.com",
      name: "Super Admin",
      password,
      role: Role.SUPER_ADMIN,
      country: "England",
      authProvider: "credentials",
      profileComplete: true,
    },
  });
}

async function createCategories() {
  const categories = [
    { name: "Laws of the Game", slug: "laws-of-the-game", type: CategoryType.LOTG, order: 1 },
    { name: "Offside", slug: "offside", type: CategoryType.CHALLENGE, order: 2 },
    { name: "Handball", slug: "handball", type: CategoryType.CHALLENGE, order: 3 },
    { name: "DOGSO/SPA", slug: "dogso-spa", type: CategoryType.CHALLENGE, order: 4 },
    { name: "Simulation", slug: "simulation", type: CategoryType.CHALLENGE, order: 5 },
    { name: "Teamwork", slug: "teamwork", type: CategoryType.CHALLENGE, order: 6 },
    { name: "Dissent", slug: "dissent", type: CategoryType.CHALLENGE, order: 7 },
    { name: "PAI", slug: "pai", type: CategoryType.CHALLENGE, order: 8 },
    { name: "VAR practice", slug: "var-practice", type: CategoryType.VAR, order: 9 },
    { name: "A.R. practice", slug: "ar-practice", type: CategoryType.AR, order: 10 },
    { name: "Video Library", slug: "video-library", type: CategoryType.LIBRARY, order: 11 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
}

async function createVideoLibraryCategoriesAndTags() {
  // Mirrors prisma/seed-video-categories.js but keeps everything under the main seed.
  const categories = [
    {
      name: "Challenges",
      slug: "challenges",
      icon: "🏃",
      description: "Critical game situations requiring instant calls",
      color: "#FF4D6D",
      order: 1,
      children: [
        { name: "Fouls", slug: "fouls", icon: "⚠️", order: 1 },
        { name: "Handball", slug: "handball", icon: "🖐️", order: 2 },
        { name: "Holding", slug: "holding", icon: "🤝", order: 3 },
        { name: "Offside", slug: "offside", icon: "🚩", order: 4 },
      ],
    },
    {
      name: "Management",
      slug: "management",
      icon: "🎯",
      description: "Game control and referee skills",
      color: "#00A5E8",
      order: 2,
      children: [
        { name: "Advantage", slug: "advantage", icon: "⚡", order: 1 },
        { name: "Communication", slug: "communication", icon: "💬", order: 2 },
        { name: "Positioning", slug: "positioning", icon: "📍", order: 3 },
        { name: "Teamwork", slug: "teamwork", icon: "👥", order: 4 },
      ],
    },
    {
      name: "Disciplinary",
      slug: "disciplinary",
      icon: "🟨",
      description: "Card decisions and misconduct",
      color: "#F5B400",
      order: 3,
      children: [
        { name: "Yellow Cards", slug: "yellow-cards", icon: "🟨", order: 1 },
        { name: "Red Cards - DOGSO", slug: "red-cards-dogso", icon: "🔴", order: 2 },
        { name: "Red Cards - SFP", slug: "red-cards-sfp", icon: "🔴", order: 3 },
        { name: "Second Yellow Cards", slug: "second-yellow", icon: "🟨🟨", order: 4 },
      ],
    },
    {
      name: "Procedures",
      slug: "procedures",
      icon: "📏",
      description: "Restart management and protocols",
      color: "#1BC47D",
      order: 4,
      children: [
        { name: "Free Kicks", slug: "free-kicks", icon: "⚽", order: 1 },
        { name: "Penalty Kicks", slug: "penalty-kicks", icon: "🎯", order: 2 },
        { name: "Restarts", slug: "restarts", icon: "🔄", order: 3 },
        { name: "Substitutions", slug: "substitutions", icon: "🔄", order: 4 },
      ],
    },
    {
      name: "VAR",
      slug: "var",
      icon: "🎬",
      description: "Video Assistant Referee decisions",
      color: "#9B59B6",
      order: 5,
      children: [
        { name: "Goals/No Goals", slug: "goals-no-goals", icon: "⚽", order: 1 },
        { name: "Penalty Decisions", slug: "penalty-decisions", icon: "🎯", order: 2 },
        { name: "Red Card Incidents", slug: "red-card-incidents", icon: "🔴", order: 3 },
        { name: "Mistaken Identity", slug: "mistaken-identity", icon: "👤", order: 4 },
      ],
    },
  ];

  for (const categoryData of categories) {
    const { children, ...parentData } = categoryData;

    const parent = await prisma.videoCategory.upsert({
      where: { slug: parentData.slug },
      update: parentData,
      create: parentData,
    });

    if (children) {
      for (const childData of children) {
        await prisma.videoCategory.upsert({
          where: { slug: childData.slug },
          update: { ...childData, parentId: parent.id },
          create: { ...childData, parentId: parent.id },
        });
      }
    }
  }

  // TAGS ARE NOW 100% USER-MANAGED VIA ADMIN UI
  // DO NOT seed tags here - if you delete a tag, it should stay deleted
  // Tags are managed entirely through the Super Admin interface
  // To restore the 14 rainbow categories, run: node scripts/restore-tag-system.js
}

async function createDemoVideoLibraryVideos() {
  // PLACEHOLDER VIDEO SEEDING REMOVED
  // Videos are now 100% user-managed via the admin UI
  // To delete existing placeholder videos, run: node scripts/delete-placeholder-videos.js
  console.log("Skipping placeholder video seeding (videos managed via admin UI)");
}

async function createLibraryArticles() {
  const articles = [
    {
      title: "Handball criteria",
      slug: "handball-criteria",
      categorySlug: "handball",
      order: 1,
      content: {
        sections: [
          {
            title: "Natural vs unnatural",
            bullets: [
              "Arm position relative to body movement",
              "Body made unnaturally bigger",
              "Distance and reaction time",
            ],
          },
          {
            title: "Considerations",
            bullets: ["Deflection path", "Expected position for the action", "Consequence (goal/penalty)"],
          },
        ],
      },
    },
    {
      title: "Offside decision-making",
      slug: "offside-decision-making",
      categorySlug: "offside",
      order: 2,
      content: {
        sections: [
          {
            title: "Interfering with play/opponent",
            bullets: ["Playing or touching the ball", "Affecting opponent ability to play the ball"],
          },
          {
            title: "Gaining advantage",
            bullets: ["Playing a rebound off post or opponent", "Deflections count as gaining advantage"],
          },
        ],
      },
    },
  ];

  for (const article of articles) {
    const category = await prisma.category.findUnique({ where: { slug: article.categorySlug } });
    if (!category) continue;
    await prisma.libraryArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        title: article.title,
        slug: article.slug,
        order: article.order,
        content: article.content,
        categoryId: category.id,
      },
    });
  }
}

async function createQuestions() {
  const lotgCategory = await prisma.category.findUnique({ where: { slug: "laws-of-the-game" } });
  if (lotgCategory) {
    const lotgQuestions = [
      {
        lawNumbers: [1],
        text: "A substitute enters the field during kicks from the penalty mark and takes a kick. What is the correct decision?",
        explanation: "Only eligible players may take part. The kick is retaken and the substitute is cautioned.",
        answers: [
          { label: "The kick is retaken and the substitute is cautioned (yellow card) for entering without permission", isCorrect: true },
          { label: "The goal stands if the ball entered the goal; the substitute is cautioned afterwards", isCorrect: false },
          { label: "The kick is retaken with no disciplinary sanction against the substitute", isCorrect: false },
          { label: "Indirect free kick to the opposing team; the kick is not retaken", isCorrect: false },
        ],
      },
      {
        lawNumbers: [3],
        text: "A defender denies an obvious goal-scoring opportunity with a handball in the penalty area while attempting to play the ball. What is the correct sanction?",
        explanation: "Penalty kick and caution (attempt to play the ball).",
        answers: [
          { label: "Penalty kick; caution (yellow card) — not sent off — because the defender made a genuine attempt to play the ball", isCorrect: true },
          { label: "Penalty kick; sending-off (red card) for denying an obvious goal-scoring opportunity by handball", isCorrect: false },
          { label: "Indirect free kick; the goalkeeper handling offence applies", isCorrect: false },
          { label: "Play continues; the handball was accidental during an attempt to play the ball", isCorrect: false },
        ],
      },
    ];

    for (const q of lotgQuestions) {
      // Check if question already exists to prevent duplicates
      const existingQuestion = await prisma.question.findFirst({
        where: {
          text: q.text,
          categoryId: lotgCategory.id,
        }
      });
      
      if (!existingQuestion) {
        const created = await prisma.question.create({
          data: {
            type: QuestionType.LOTG_TEXT,
            categoryId: lotgCategory.id,
            lawNumbers: q.lawNumbers || [],
            text: q.text,
            explanation: q.explanation,
            answerOptions: {
              create: q.answers.map((a, idx) => ({
                label: a.label,
                code: `OPT_${idx}`,
                isCorrect: a.isCorrect,
                order: idx,
              })),
            },
          },
        });
        await prisma.question.update({
          where: { id: created.id },
          data: { difficulty: 1 },
        });
      }
    }
  }

  // NOTE: Video challenge seeding was intentionally removed here.
  // The "Video Library" feature uses URL-based videos and is seeded separately in createDemoVideoLibraryVideos().
  // VAR and AR practice videos/questions are now managed exclusively through the admin UI.
  
  console.log("Skipping VAR/AR practice video seeding (managed via admin UI)");
}

async function createAssignments() {
  const user = await prisma.user.findUnique({ where: { email: "referee@example.com" } });
  const handballCategory = await prisma.category.findUnique({ where: { slug: "handball" } });
  const offsideCategory = await prisma.category.findUnique({ where: { slug: "offside" } });
  if (user && handballCategory && offsideCategory) {
    await prisma.trainingAssignment.createMany({
      data: [
        {
          userId: user.id,
          categoryId: handballCategory.id,
          targetScore: 8,
          status: AssignmentStatus.NOT_STARTED,
        },
        {
          userId: user.id,
          categoryId: offsideCategory.id,
          targetScore: 8,
          status: AssignmentStatus.NOT_STARTED,
        },
      ],
      skipDuplicates: true,
    });
  }
}

async function createMandatoryTests() {
  // Skip seeding mandatory tests - they should only be created via the admin UI
  // This prevents deleted tests from reappearing on every server restart
  console.log("Skipping mandatory test seeding (managed via admin UI)");
}

async function main() {
  await createUsers();
  await createCategories();
  await createVideoLibraryCategoriesAndTags();
  await createLibraryArticles();
  await createQuestions();
  await createDemoVideoLibraryVideos();
  await createMandatoryTests();
  await createAssignments();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

