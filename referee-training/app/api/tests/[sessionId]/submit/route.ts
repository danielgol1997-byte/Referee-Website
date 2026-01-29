import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type AnswerSubmission = {
  questionId: string;
  selectedOptionId: string;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const body = await request.json();
  const { answers } = body ?? {};

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // Verify session belongs to user
    const testSession = await prisma.testSession.findUnique({
      where: { id: resolvedParams.sessionId },
    });

    if (!testSession || testSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all questions with their answer options
    const questionIds = answers.map((a: AnswerSubmission) => a.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { answerOptions: true },
    });

    // Create a map for quick lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Check for existing answers in bulk
    const existingAnswers = await prisma.testAnswer.findMany({
      where: {
        testSessionId: resolvedParams.sessionId,
        questionId: { in: questionIds },
      },
    });

    const existingAnswersMap = new Map(
      existingAnswers.map(a => [a.questionId, a])
    );

    // Prepare batch insert data
    const answersToCreate = [];
    const answersToUpdate = [];

    for (const answer of answers as AnswerSubmission[]) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const selectedOption = question.answerOptions.find(
        (opt) => opt.id === answer.selectedOptionId
      );
      if (!selectedOption) continue;

      const isCorrect = !!selectedOption.isCorrect;

      // Check if answer already exists
      const existing = existingAnswersMap.get(answer.questionId);

      if (existing) {
        answersToUpdate.push({
          where: { id: existing.id },
          data: {
            selectedOptionId: answer.selectedOptionId,
            isCorrect,
          },
        });
      } else {
        answersToCreate.push({
          testSessionId: resolvedParams.sessionId,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          isCorrect,
        });
      }
    }

    // Execute batch operations
    await Promise.all([
      answersToCreate.length > 0
        ? prisma.testAnswer.createMany({ data: answersToCreate })
        : Promise.resolve(),
      ...answersToUpdate.map((update) =>
        prisma.testAnswer.update(update)
      ),
    ]);

    // Calculate and update score
    const allAnswers = await prisma.testAnswer.findMany({
      where: { testSessionId: resolvedParams.sessionId },
    });

    const correctCount = allAnswers.filter((a) => a.isCorrect).length;
    
    await prisma.testSession.update({
      where: { id: resolvedParams.sessionId },
      data: {
        score: correctCount,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      correctCount,
      totalQuestions: testSession.totalQuestions,
    });
  } catch (error) {
    console.error("Batch submit error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit answers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
