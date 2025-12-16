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
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
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

  const videoCategories = [
    { slug: "offside", title: "Offside challenge" },
    { slug: "handball", title: "Handball challenge" },
    { slug: "dogso-spa", title: "DOGSO/SPA challenge" },
  ];

  for (const item of videoCategories) {
    const category = await prisma.category.findUnique({ where: { slug: item.slug } });
    if (!category) continue;

    // Check if clip already exists
    let clip = await prisma.videoClip.findFirst({
      where: { 
        title: `${item.title} clip 1`,
        categoryId: category.id
      }
    });
    
    if (!clip) {
      clip = await prisma.videoClip.create({
        data: {
          title: `${item.title} clip 1`,
          fileUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
          thumbnailUrl: "",
          categoryId: category.id,
          tags: ["placeholder"],
        },
      });
    }

    const existingQuestion = await prisma.question.findFirst({
      where: {
        text: `Decide the correct outcome for ${item.title}.`,
        categoryId: category.id
      }
    });
    
    if (!existingQuestion) {
      await prisma.question.create({
        data: {
          type: QuestionType.VIDEO_CHALLENGE,
          categoryId: category.id,
          videoClipId: clip.id,
          text: `Decide the correct outcome for ${item.title}.`,
          explanation: "Consider foul severity, restart, and disciplinary sanction.",
          answerOptions: {
            create: [
              { label: "No foul", code: "NO_FOUL", isCorrect: false },
              { label: "Careless foul", code: "CARELESS", isCorrect: true },
              { label: "Reckless – Yellow", code: "RECKLESS", isCorrect: false },
              { label: "Serious foul play – Red", code: "SFP", isCorrect: false },
            ],
          },
        },
      });
    }
  }

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
          tags: ["VAR", "SFP"],
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
          tags: ["AR", "Offside"],
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
  await createLibraryArticles();
  await createQuestions();
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

