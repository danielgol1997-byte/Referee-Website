import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitVideoTestAnswers } from "@/lib/video-test-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type AnswerSubmission = {
  videoClipId: string;
  playOnNoOffence: boolean;
  restartTagId?: string | null;
  sanctionTagId?: string | null;
  criteriaTagIds?: string[];
  timeToAnswerMs?: number | null;
  questionStartedAt?: string | null;
  questionAnsweredAt?: string | null;
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
    const result = await submitVideoTestAnswers(
      session.user.id,
      resolvedParams.sessionId,
      answers as AnswerSubmission[]
    );
    return NextResponse.json({
      success: true,
      correctCount: result.correctCount,
      totalClips: result.totalClips,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit answers";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
