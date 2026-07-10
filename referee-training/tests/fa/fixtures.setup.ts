/**
 * FA suite fixtures.
 *
 * Creates a deterministic two-federation world (all rows prefixed PWFA/pwfa-):
 *   - PWFA Alpha FA + PWFA Beta FA, each with ranks
 *   - one super admin, an FA admin + referee per federation, and users with no FA
 *   - scoped content: questions, laws tests, video clips, video tests
 *     (one global / one Alpha / one Beta of each)
 *
 * Then logs every fixture user in and saves per-role storage states used by
 * the fa-*.spec.ts files. Only PWFA-prefixed rows are ever (re)created or
 * removed, so real data is untouched.
 */
import { test as setup, expect } from "@playwright/test";
import { hash } from "bcryptjs";
import { loadEnv, loginAndSave, statePath, writeFixtureIds, PW } from "./helpers";

loadEnv();
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { prisma } from "../../lib/prisma";

setup("create FA fixtures and per-role auth states", async ({ playwright }) => {
  setup.setTimeout(180_000);

  // ---------------------------------------------------------------- FAs
  const alphaFa = await prisma.association.upsert({
    where: { name: PW.fas.alpha },
    update: { countryCode: "AR", isActive: true },
    create: { name: PW.fas.alpha, countryCode: "AR" },
  });
  const betaFa = await prisma.association.upsert({
    where: { name: PW.fas.beta },
    update: { countryCode: "BR", isActive: true },
    create: { name: PW.fas.beta, countryCode: "BR" },
  });
  // International federation (FIFA/UEFA-style) with categories inside it.
  const intlFed = await prisma.association.upsert({
    where: { name: PW.fas.intl },
    update: { isInternational: true, isActive: true },
    create: { name: PW.fas.intl, isInternational: true },
  });

  // ---------------------------------------------------------------- Ranks
  async function ensureRank(name: string, associationId: string, order: number) {
    const existing = await prisma.rank.findFirst({ where: { name, associationId } });
    if (existing) return existing;
    return prisma.rank.create({ data: { name, associationId, order } });
  }
  const alphaElite = await ensureRank(PW.ranks.alphaElite, alphaFa.id, 0);
  const alphaFirst = await ensureRank(PW.ranks.alphaFirst, alphaFa.id, 1);
  const betaElite = await ensureRank(PW.ranks.betaElite, betaFa.id, 0);
  await ensureRank(PW.ranks.betaFirst, betaFa.id, 1);
  const intlElite = await ensureRank(PW.ranks.intlElite, intlFed.id, 0);
  const intlFirst = await ensureRank(PW.ranks.intlFirst, intlFed.id, 1);

  // ---------------------------------------------------------------- Users
  const passwordHash = await hash(PW.password, 10);
  async function ensureUser(
    email: string,
    name: string,
    role: "REFEREE" | "ADMIN" | "SUPER_ADMIN",
    associationId: string | null
  ) {
    return prisma.user.upsert({
      where: { email },
      update: {
        name,
        password: passwordHash,
        role,
        associationId,
        // Deterministic baseline: specs assign ranks/federations themselves.
        rankId: null,
        internationalAssociationId: null,
        internationalRankId: null,
        authProvider: "credentials",
        profileComplete: true,
        isActive: true,
      },
      create: {
        email,
        name,
        password: passwordHash,
        role,
        associationId,
        authProvider: "credentials",
        profileComplete: true,
        isActive: true,
        country: "Testland",
      },
    });
  }

  await ensureUser(PW.users.super, "PWFA Super Admin", "SUPER_ADMIN", null);
  const adminAlpha = await ensureUser(PW.users.adminAlpha, "PWFA Admin Alpha", "ADMIN", alphaFa.id);
  await ensureUser(PW.users.adminBeta, "PWFA Admin Beta", "ADMIN", betaFa.id);
  await ensureUser(PW.users.adminNoFa, "PWFA Admin NoFA", "ADMIN", null);
  const refAlpha = await ensureUser(PW.users.refAlpha, "PWFA Referee Alpha", "REFEREE", alphaFa.id);
  const refBeta = await ensureUser(PW.users.refBeta, "PWFA Referee Beta", "REFEREE", betaFa.id);
  const refNoFa = await ensureUser(PW.users.refNoFa, "PWFA Referee NoFA", "REFEREE", null);

  // ---------------------------------------------------------------- Content
  const lotg = await prisma.category.findUnique({ where: { slug: "laws-of-the-game" } });
  const challenge = await prisma.category.findUnique({ where: { slug: "offside" } });
  expect(lotg, "laws-of-the-game category must exist (run prisma db seed)").toBeTruthy();
  expect(challenge, "offside category must exist (run prisma db seed)").toBeTruthy();
  if (!lotg || !challenge) throw new Error("unreachable");

  // Recreate PWFA content from scratch each run. The where clauses are
  // restricted to the PWFA prefix, so this can only ever remove suite rows.
  const oldTests = await prisma.mandatoryTest.findMany({
    where: { title: { startsWith: "PWFA " } },
    select: { id: true },
  });
  const oldTestIds = oldTests.map((t) => t.id);
  if (oldTestIds.length > 0) {
    await prisma.userTestCompletion.deleteMany({ where: { mandatoryTestId: { in: oldTestIds } } });
    await prisma.mandatoryTest.deleteMany({ where: { id: { in: oldTestIds } } });
  }
  await prisma.question.deleteMany({ where: { text: { startsWith: "PWFA " } } });
  await prisma.videoTest.deleteMany({ where: { name: { startsWith: "PWFA " } } });
  await prisma.videoClip.deleteMany({ where: { title: { startsWith: "PWFA " } } });

  const answerOptions = {
    create: [
      { label: "Correct answer", code: "A", isCorrect: true, order: 0 },
      { label: "Wrong answer B", code: "B", isCorrect: false, order: 1 },
      { label: "Wrong answer C", code: "C", isCorrect: false, order: 2 },
    ],
  };
  const questionBase = {
    type: "LOTG_TEXT" as const,
    categoryId: lotg.id,
    explanation: "PWFA fixture explanation.",
    lawNumbers: [1],
    isActive: true,
    isUpToDate: true,
  };
  const globalQuestion = await prisma.question.create({
    data: { ...questionBase, text: PW.content.globalQuestion, isIfab: true, associationId: null, answerOptions },
  });
  const alphaQuestion = await prisma.question.create({
    data: { ...questionBase, text: PW.content.alphaQuestion, isIfab: false, associationId: alphaFa.id, answerOptions },
  });
  const betaQuestion = await prisma.question.create({
    data: { ...questionBase, text: PW.content.betaQuestion, isIfab: false, associationId: betaFa.id, answerOptions },
  });

  const testBase = {
    categoryId: lotg.id,
    createdById: adminAlpha.id, // any user works; scoping is by associationId
    totalQuestions: 3,
    lawNumbers: [] as number[],
    questionIds: [] as string[],
    isActive: true,
    isUserGenerated: false,
  };
  for (const [title, isMandatory, associationId] of [
    [PW.content.globalMandatoryTest, true, null],
    [PW.content.alphaMandatoryTest, true, alphaFa.id],
    [PW.content.betaMandatoryTest, true, betaFa.id],
    [PW.content.globalPoolTest, false, null],
    [PW.content.alphaPoolTest, false, alphaFa.id],
    [PW.content.betaPoolTest, false, betaFa.id],
  ] as const) {
    await prisma.mandatoryTest.create({
      data: { ...testBase, title, isMandatory, associationId },
    });
  }

  const clipBase = {
    categoryId: challenge.id,
    fileUrl: "https://example.com/pwfa-fixture.mp4",
    videoType: "MATCH_CLIP" as const,
    isActive: true,
    isEducational: false,
  };
  const globalClip = await prisma.videoClip.create({
    data: { ...clipBase, title: PW.content.globalClip, associationId: null },
  });
  const alphaClip = await prisma.videoClip.create({
    data: { ...clipBase, title: PW.content.alphaClip, associationId: alphaFa.id },
  });
  const betaClip = await prisma.videoClip.create({
    data: { ...clipBase, title: PW.content.betaClip, associationId: betaFa.id },
  });

  for (const [name, type, associationId] of [
    [PW.content.globalVideoPool, "PUBLIC", null],
    [PW.content.alphaVideoPool, "PUBLIC", alphaFa.id],
    [PW.content.betaVideoPool, "PUBLIC", betaFa.id],
    [PW.content.globalVideoMandatory, "MANDATORY", null],
    [PW.content.alphaVideoMandatory, "MANDATORY", alphaFa.id],
    [PW.content.betaVideoMandatory, "MANDATORY", betaFa.id],
  ] as const) {
    await prisma.videoTest.create({
      data: {
        name,
        type,
        associationId,
        totalClips: 1,
        createdById: adminAlpha.id,
        maxViewsPerClip: type === "MANDATORY" ? 2 : null,
        dueDate: type === "MANDATORY" ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : null,
        isActive: true,
      },
    });
  }

  writeFixtureIds({
    alphaFaId: alphaFa.id,
    betaFaId: betaFa.id,
    alphaEliteRankId: alphaElite.id,
    alphaFirstRankId: alphaFirst.id,
    betaEliteRankId: betaElite.id,
    intlFedId: intlFed.id,
    intlEliteCategoryId: intlElite.id,
    intlFirstCategoryId: intlFirst.id,
    refAlphaId: refAlpha.id,
    refBetaId: refBeta.id,
    refNoFaId: refNoFa.id,
    adminAlphaId: adminAlpha.id,
    globalQuestionId: globalQuestion.id,
    alphaQuestionId: alphaQuestion.id,
    betaQuestionId: betaQuestion.id,
    betaClipId: betaClip.id,
    alphaClipId: alphaClip.id,
    globalClipId: globalClip.id,
  });

  // ---------------------------------------------------------------- Logins
  for (const who of Object.keys(PW.users) as Array<keyof typeof PW.users>) {
    await loginAndSave(playwright, PW.users[who], statePath(who));
  }

  console.log(
    "PWFA fixtures ready: 2 FAs + 1 intl fed, 7 users, 3 questions, 6 laws tests, 3 clips, 6 video tests"
  );
});
