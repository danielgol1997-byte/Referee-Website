import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

// Fisher-Yates shuffle algorithm for answer shuffling
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;

  const testSession = await prisma.testSession.findUnique({
    where: { id: resolvedParams.sessionId },
  });
  
  if (!testSession || testSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: testSession.questionIds } },
    include: { answerOptions: true, videoClip: true },
  });

  // preserve the order of questionIds
  const ordered = testSession.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  // Shuffle answer options for each question
  const questionsWithShuffledAnswers = ordered.map((question) => {
    if (!question) return question;
    return {
      ...question,
      answerOptions: shuffleArray(question.answerOptions),
    };
  });

  return NextResponse.json({ questions: questionsWithShuffledAnswers });
}

