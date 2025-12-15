import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAnswer } from "@/lib/test-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const body = await request.json();
  const { questionId, selectedOptionId } = body ?? {};

  if (!questionId || !selectedOptionId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await recordAnswer({
      userId: session.user.id,
      sessionId: resolvedParams.sessionId,
      questionId,
      selectedOptionId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record answer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

