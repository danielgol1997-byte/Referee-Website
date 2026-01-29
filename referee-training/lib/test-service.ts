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
  includeVar?: boolean;
  includeIfab?: boolean;
  includeCustom?: boolean;
};

/**
 * Fisher-Yates shuffle algorithm for true randomization
 * This ensures uniform distribution unlike Array.sort()
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function createTestSession({
  userId,
  type,
  categorySlug,
  categoryType,
  lawNumbers,
  totalQuestions = 10,
  mandatoryTestId,
  includeVar = false,
  includeIfab = true,
  includeCustom = false,
}: CreateSessionParams) {
  const where: Prisma.CategoryWhereInput = {};
  if (categorySlug) where.slug = categorySlug;
  if (categoryType) where.type = categoryType;

  const category = await prisma.category.findFirst({ where });

  if (!category) {
    throw new Error("Category not found");
  }

  let selected: any[] = [];
  let mandatoryTest = null;

  // Check if this is a mandatory test and fetch it to get source settings
  if (mandatoryTestId) {
    mandatoryTest = await prisma.mandatoryTest.findUnique({
      where: { id: mandatoryTestId },
    });

    // Use the test's source settings if available
    if (mandatoryTest) {
      includeIfab = mandatoryTest.includeIfab ?? true;
      includeCustom = mandatoryTest.includeCustom ?? false;
    }

    // If test has specific question IDs, use those (question-specific test)
    if (mandatoryTest?.questionIds && mandatoryTest.questionIds.length > 0) {
      // Question-specific test: use the exact questions, but randomize their order
      // Filter for active questions only, consistent with regular question selection
      const specificQuestionsWhere: Prisma.QuestionWhereInput = {
        id: { in: mandatoryTest.questionIds },
        isActive: true,
        isUpToDate: true,  // Only show up-to-date questions to users
      };

      // Filter by IFAB status based on include flags
      if (includeIfab && !includeCustom) {
        specificQuestionsWhere.isIfab = true;
      } else if (!includeIfab && includeCustom) {
        specificQuestionsWhere.isIfab = false;
      }
      // If both or neither, don't add any isIfab filter

      const specificQuestions = await prisma.question.findMany({
        where: specificQuestionsWhere,
        include: { answerOptions: true },
      });

      if (specificQuestions.length === 0) {
        throw new Error("No questions found for this test.");
      }

      // Randomize the order of the specific questions
      selected = shuffleArray(specificQuestions);
    }
  }

  // If no specific questions, select randomly from the pool
  if (selected.length === 0) {
    const questionWhere: Prisma.QuestionWhereInput = { 
      type, 
      categoryId: category.id,
      isActive: true,
      isUpToDate: true  // Only show up-to-date questions to users
    };
    
    // Filter by IFAB status based on include flags
    if (includeIfab && !includeCustom) {
      questionWhere.isIfab = true;
    } else if (!includeIfab && includeCustom) {
      questionWhere.isIfab = false;
    }
    // If both or neither, don't add any isIfab filter
    
    // Filter out VAR questions by default unless requested
    if (!includeVar) {
      questionWhere.isVar = false;
    }
    
    // Filter by lawNumbers - questions that have ANY of the specified law numbers
    if (lawNumbers?.length) {
      questionWhere.lawNumbers = { hasSome: lawNumbers };
    }

    const allQuestions = await prisma.question.findMany({
      where: questionWhere,
      include: { answerOptions: true },
    });

    if (allQuestions.length === 0) {
      throw new Error("No questions available for this category.");
    }

    // Use Fisher-Yates shuffle for true randomization
    const shuffled = shuffleArray(allQuestions);
    selected = shuffled.slice(0, totalQuestions);
  }

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
      mandatoryTest: true,
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

