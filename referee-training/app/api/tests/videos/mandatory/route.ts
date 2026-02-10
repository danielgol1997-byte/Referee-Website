import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMandatoryVideoTests } from "@/lib/video-test-service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tests = await getMandatoryVideoTests(session.user.id);
    return NextResponse.json({ tests });
  } catch (error) {
    console.error("[VIDEO_TESTS_MANDATORY][GET]", error);
    return NextResponse.json({ error: "Failed to load mandatory video tests" }, { status: 500 });
  }
}
