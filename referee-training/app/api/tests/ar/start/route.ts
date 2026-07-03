import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createArTestSession } from "@/lib/ar-test-service";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { session: testSession } = await createArTestSession(session.user.id);
    return NextResponse.json({ session: testSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start AR test";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
