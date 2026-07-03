import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitArTestAnswers } from "@/lib/ar-test-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type AnswerSubmission = {
  arClipId: string;
  answer: "OFFSIDE" | "ONSIDE";
  timeToAnswerMs?: number | null;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null);
  const answers = body?.answers;

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await submitArTestAnswers(
      session.user.id,
      sessionId,
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
