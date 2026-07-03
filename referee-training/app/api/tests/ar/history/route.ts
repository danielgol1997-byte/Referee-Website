import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getArTestHistory } from "@/lib/ar-test-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [history, activeClipCount] = await Promise.all([
    getArTestHistory(session.user.id),
    prisma.arClip.count({ where: { isActive: true } }),
  ]);

  return NextResponse.json({ history, activeClipCount });
}
