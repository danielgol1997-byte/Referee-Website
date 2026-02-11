import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeClipView } from "@/lib/video-test-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const videoClipId = body?.videoClipId as string | undefined;
  if (!videoClipId) {
    return NextResponse.json({ error: "videoClipId is required" }, { status: 400 });
  }

  try {
    const result = await consumeClipView(session.user.id, sessionId, videoClipId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to consume view";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
