import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMandatoryTestsForUser } from "@/lib/test-service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tests = await getMandatoryTestsForUser(session.user.id, "laws-of-the-game");
    return NextResponse.json({ tests });
  } catch (error) {
    console.error("[MANDATORY_TESTS][GET]", error);
    return NextResponse.json({ error: "Failed to load mandatory tests" }, { status: 500 });
  }
}
