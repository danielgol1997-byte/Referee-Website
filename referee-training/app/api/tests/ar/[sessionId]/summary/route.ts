import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getArTestSessionSummary } from "@/lib/ar-test-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  try {
    const summary = await getArTestSessionSummary(session.user.id, sessionId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load summary";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
