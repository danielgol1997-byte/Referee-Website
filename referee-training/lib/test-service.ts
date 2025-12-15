import { prisma } from "./prisma";
import { CategoryType, Prisma, QuestionType } from "@prisma/client";

type CreateSessionParams = {
  userId: string;
  type: QuestionType;
  categorySlug?: string;
  categoryType?: CategoryType;
  lawNumbers?: number[];
  totalQuestions?: number;
  mandatoryTestId?: string;
};

export async function createTestSession({
  userId,
  type,
  categorySlug,
  categoryType,
  lawNumbers,
  totalQuestions = 10,
  mandatoryTestId,
}: CreateSessionParams) {
  const where: Prisma.CategoryWhereInput = {};
  if (categorySlug) where.slug = categorySlug;
  if (categoryType) where.type = categoryType;

  const category = await prisma.category.findFirst({ where });

  if (!category) {
    throw new Error("Category not found");
  }

  const questionWhere: Prisma.QuestionWhereInput = { type, categoryId: category.id };
  if (lawNumbers?.length) {
    questionWhere.lawNumber = { in: lawNumbers };
  }

  const allQuestions = await prisma.question.findMany({
    where: questionWhere,
    include: { answerOptions: true },
  });

  if (allQuestions.length === 0) {
    throw new Error("No questions available for this category.");
  }

  const shuffled = allQuestions.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, totalQuestions);

  const session = await prisma.testSession.create({
    data: {
      userId,
      categoryId: category.id,
      type,
      mandatoryTestId,
      questionIds: selected.map((q) => q.id),
      totalQuestions: selected.length,
    },
  });

  return { session, questions: selected };
}

type CreateMandatoryTestParams = {
  title: string;
  description?: string | null;
  categorySlug?: string;
  categoryId?: string;
  lawNumbers: number[];
  totalQuestions: number;
  passingScore?: number | null;
  dueDate?: Date | null;
  isActive?: boolean;
  createdById: string;
};

export async function createMandatoryTest({
  title,
  description,
  categorySlug,
  categoryId,
  lawNumbers,
  totalQuestions,
  passingScore,
  dueDate,
  isActive = true,
  createdById,
}: CreateMandatoryTestParams) {
  const category =
    categoryId ||
    (categorySlug
      ? (
          await prisma.category.findUnique({
            where: { slug: categorySlug },
          })
        )?.id
      : null);

  if (!category) {
    throw new Error("Category not found for mandatory test.");
  }

  return prisma.mandatoryTest.create({
    data: {
      title,
      description,
      categoryId: category,
      lawNumbers,
      totalQuestions,
      passingScore,
      dueDate: dueDate ?? undefined,
      isActive,
      createdById,
    },
  });
}

export async function getMandatoryTestsForUser(userId: string, categorySlug?: string) {
  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug } })
    : null;

  const tests = await prisma.mandatoryTest.findMany({
    where: {
      isActive: true, // Must be visible
      isMandatory: true, // Only mandatory tests
      categoryId: category?.id,
    },
    include: {
      completions: {
        where: { userId },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return tests.map((test) => ({
    ...test,
    completed: test.completions.length > 0,
    completion: test.completions[0] ?? null,
  }));
}

export async function recordAnswer({
  userId,
  sessionId,
  questionId,
  selectedOptionId,
}: {
  userId: string;
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) {
    throw new Error("Session not found");
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { answerOptions: true },
  });

  if (!question) throw new Error("Question not found");

  const selectedOption = question.answerOptions.find((opt) => opt.id === selectedOptionId);
  if (!selectedOption) throw new Error("Invalid answer option");

  const isCorrect = !!selectedOption.isCorrect;

  const existing = await prisma.testAnswer.findFirst({
    where: { testSessionId: sessionId, questionId },
  });

  if (existing) {
    await prisma.testAnswer.update({
      where: { id: existing.id },
      data: {
        selectedOptionId,
        isCorrect,
      },
    });
  } else {
    await prisma.testAnswer.create({
      data: {
        testSessionId: sessionId,
        questionId,
        selectedOptionId,
        isCorrect,
      },
    });
  }

  return { isCorrect, explanation: question.explanation };
}

export async function getSessionSummary(userId: string, sessionId: string) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      testAnswers: {
        include: {
          question: { include: { answerOptions: true } },
          selectedOption: true,
        },
      },
      category: true,
    },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Session not found");
  }

  const correctCount = session.testAnswers.filter((a) => a.isCorrect).length;
  const total = session.totalQuestions;
  const score = correctCount;

  if (session.score !== score || !session.completedAt) {
    await prisma.testSession.update({
      where: { id: session.id },
      data: { score, completedAt: new Date() },
    });
  }

  return { session: { ...session, score }, correctCount, total };
}

