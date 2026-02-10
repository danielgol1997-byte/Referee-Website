import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPoolVideoTests } from "@/lib/video-test-service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { public: publicTests, myTests } = await getPoolVideoTests(session.user.id);
    return NextResponse.json({ tests: [...publicTests, ...myTests], public: publicTests, myTests });
  } catch (error) {
    console.error("[VIDEO_TESTS_POOL][GET]", error);
    return NextResponse.json({ error: "Failed to load video test pool" }, { status: 500 });
  }
}
