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

  const tags = [
    { name: "Handball", slug: "handball", category: "CONCEPT", color: "#FF6B6B" },
    { name: "Offside", slug: "offside", category: "CONCEPT", color: "#4ECDC4" },
    { name: "DOGSO", slug: "dogso", category: "CONCEPT", color: "#FF4D6D" },
    { name: "SPA", slug: "spa", category: "CONCEPT", color: "#FFB347" },
    { name: "Simulation", slug: "simulation", category: "CONCEPT", color: "#95E1D3" },
    { name: "Serious Foul Play", slug: "serious-foul-play", category: "CONCEPT", color: "#C44569" },

    { name: "Penalty Area", slug: "penalty-area", category: "SCENARIO", color: "#A8E6CF" },
    { name: "Counter Attack", slug: "counter-attack", category: "SCENARIO", color: "#FFDAC1" },
    { name: "Set Piece", slug: "set-piece", category: "SCENARIO", color: "#B5EAD7" },
    { name: "Corner Kick", slug: "corner-kick", category: "SCENARIO", color: "#C7CEEA" },

    { name: "Clear Decision", slug: "clear-decision", category: "GENERAL", color: "#1BC47D" },
    { name: "Difficult Decision", slug: "difficult-decision", category: "GENERAL", color: "#F5B400" },
    { name: "Controversial", slug: "controversial", category: "GENERAL", color: "#FF4D6D" },
  ];

  for (const tagData of tags) {
    await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: tagData,
      create: tagData,
    });
  }
}

async function createDemoVideoLibraryVideos() {
  // URL-based seeding only (no file upload / no /public/videos dependency)
  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  if (!superAdmin) return;

  const libraryCategory = await prisma.category.findUnique({ where: { slug: "video-library" } });
  if (!libraryCategory) return;

  const [handballCategory, offsideCategory, dogsoCategory] = await Promise.all([
    prisma.videoCategory.findUnique({ where: { slug: "handball" } }),
    prisma.videoCategory.findUnique({ where: { slug: "offside" } }),
    prisma.videoCategory.findUnique({ where: { slug: "red-cards-dogso" } }),
  ]);

  const [handballTag, offsideTag, dogsoTag, penaltyAreaTag] = await Promise.all([
    prisma.tag.findUnique({ where: { slug: "handball" } }),
    prisma.tag.findUnique({ where: { slug: "offside" } }),
    prisma.tag.findUnique({ where: { slug: "dogso" } }),
    prisma.tag.findUnique({ where: { slug: "penalty-area" } }),
  ]);

  const sampleVideos = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  ];

  function pick(arr, i) {
    return arr[i % arr.length];
  }

  const planned = [];
  if (handballCategory?.id) {
    for (let i = 1; i <= 10; i++) {
      planned.push({
        title: `Handball Scenario #${i}`,
        fileUrl: pick(sampleVideos, i),
        videoCategoryId: handballCategory.id,
        lawNumbers: [12],
        sanctionType: i % 3 === 0 ? "YELLOW_CARD" : "NO_CARD",
        restartType: "PENALTY_KICK",
        varRelevant: true,
      });
    }
  }
  if (offsideCategory?.id) {
    for (let i = 1; i <= 10; i++) {
      planned.push({
        title: `Offside Scenario #${i}`,
        fileUrl: pick(sampleVideos, i + 10),
        videoCategoryId: offsideCategory.id,
        lawNumbers: [11],
        sanctionType: "NO_CARD",
        restartType: "INDIRECT_FREE_KICK",
        varRelevant: true,
      });
    }
  }
  if (dogsoCategory?.id) {
    for (let i = 1; i <= 10; i++) {
      planned.push({
        title: `DOGSO Scenario #${i}`,
        fileUrl: pick(sampleVideos, i + 20),
        videoCategoryId: dogsoCategory.id,
        lawNumbers: [12],
        sanctionType: "RED_CARD",
        restartType: "DIRECT_FREE_KICK",
        varRelevant: true,
      });
    }
  }

  for (let i = 0; i < planned.length; i++) {
    const v = planned[i];

    const existing = await prisma.videoClip.findFirst({
      where: {
        title: v.title,
        categoryId: libraryCategory.id,
      },
      select: { id: true },
    });
    if (existing) continue;

    const created = await prisma.videoClip.create({
      data: {
        title: v.title,
        description: "Seeded demo clip (URL-based) for staging.",
        fileUrl: v.fileUrl,
        thumbnailUrl: null,
        duration: null,
        videoType: "MATCH_CLIP",
        categoryId: libraryCategory.id,
        videoCategoryId: v.videoCategoryId,
        correctDecision: null,
        decisionExplanation: null,
        keyPoints: [],
        commonMistakes: [],
        lawNumbers: v.lawNumbers ?? [],
        sanctionType: v.sanctionType,
        restartType: v.restartType,
        varRelevant: v.varRelevant ?? false,
        varNotes: null,
        isActive: true,
        isFeatured: i < 6,
        order: i + 1,
        uploadedById: superAdmin.id,
        viewCount: 0,
      },
      select: { id: true, title: true },
    });

    const tagIds = [];
    if (v.title.startsWith("Handball") && handballTag) tagIds.push(handballTag.id);
    if (v.title.startsWith("Offside") && offsideTag) tagIds.push(offsideTag.id);
    if (v.title.startsWith("DOGSO") && dogsoTag) tagIds.push(dogsoTag.id);
    if (v.title.includes("Handball") && penaltyAreaTag) tagIds.push(penaltyAreaTag.id);

    for (const tagId of tagIds) {
      await prisma.videoTag.upsert({
        where: { videoId_tagId: { videoId: created.id, tagId } },
        update: {},
        create: { videoId: created.id, tagId },
      });
    }
  }
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
          { label: "Allow the goal", isCorrect: false },
          { label: "Retake the kick and caution the substitute", isCorrect: true },
          { label: "Retake the kick without caution", isCorrect: false },
          { label: "Award an indirect free kick to the opponents", isCorrect: false },
        ],
      },
      {
        lawNumbers: [3],
        text: "A defender denies an obvious goal-scoring opportunity with a handball in the penalty area while attempting to play the ball. What is the correct sanction?",
        explanation: "Penalty kick and caution (attempt to play the ball).",
        answers: [
          { label: "Penalty + Yellow", isCorrect: true },
          { label: "Penalty + Red", isCorrect: false },
          { label: "Indirect free kick", isCorrect: false },
          { label: "Play on", isCorrect: false },
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

  const varCategory = await prisma.category.findUnique({ where: { slug: "var-practice" } });
  if (varCategory) {
    let clip = await prisma.videoClip.findFirst({
      where: {
        title: "VAR elbow example",
        categoryId: varCategory.id
      }
    });
    
    if (!clip) {
      clip = await prisma.videoClip.create({
        data: {
          title: "VAR elbow example",
          fileUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
          categoryId: varCategory.id,
        },
      });
    }
    const existingVarQuestion = await prisma.question.findFirst({
      where: {
        text: "Referee decision and VAR recommendation?",
        categoryId: varCategory.id
      }
    });
    
    if (!existingVarQuestion) {
      await prisma.question.create({
        data: {
          type: QuestionType.VAR_CLIP,
          categoryId: varCategory.id,
          videoClipId: clip.id,
          text: "Referee decision and VAR recommendation?",
          explanation: "Using the elbow as a weapon warrants a red card; VAR should recommend intervention.",
          answerOptions: {
            create: [
              { label: "Yellow + Check complete", code: "YELLOW_CHECK", isCorrect: false },
              { label: "Red + Intervention", code: "RED_INTERVENTION", isCorrect: true },
              { label: "No card + Check complete", code: "NO_CARD", isCorrect: false },
              { label: "Red + Check complete", code: "RED_COMPLETE", isCorrect: false },
            ],
          },
        },
      });
    }
  }

  const arCategory = await prisma.category.findUnique({ where: { slug: "ar-practice" } });
  if (arCategory) {
    let clip = await prisma.videoClip.findFirst({
      where: {
        title: "Assistant referee offside",
        categoryId: arCategory.id
      }
    });
    
    if (!clip) {
      clip = await prisma.videoClip.create({
        data: {
          title: "Assistant referee offside",
          fileUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
          categoryId: arCategory.id,
        },
      });
    }

    const existingArQuestion = await prisma.question.findFirst({
      where: {
        text: "Should the assistant referee flag for offside?",
        categoryId: arCategory.id
      }
    });
    
    if (!existingArQuestion) {
      await prisma.question.create({
        data: {
          type: QuestionType.AR_CLIP,
          categoryId: arCategory.id,
          videoClipId: clip.id,
          text: "Should the assistant referee flag for offside?",
          explanation: "The attacker gains advantage from a rebound, so flag for offside.",
          answerOptions: {
            create: [
              { label: "No offside, allow play", code: "PLAY_ON", isCorrect: false },
              { label: "Offside – indirect free kick", code: "OFFSIDE", isCorrect: true },
              { label: "Penalty kick", code: "PENALTY", isCorrect: false },
              { label: "Drop ball", code: "DROP_BALL", isCorrect: false },
            ],
          },
        },
      });
    }
  }
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

