import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVideoTestSession } from "@/lib/video-test-service";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const videoTestId = body?.videoTestId as string;
    if (!videoTestId) {
      return NextResponse.json({ error: "videoTestId is required" }, { status: 400 });
    }

    const { session: testSession } = await createVideoTestSession(session.user.id, videoTestId);
    return NextResponse.json({ session: testSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start video test";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
