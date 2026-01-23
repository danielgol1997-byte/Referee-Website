import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * GET /api/debug/promote-super-admin
 * Dev-only helper: promotes the current session user to SUPER_ADMIN.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: Role.SUPER_ADMIN, profileComplete: true },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      profileComplete: true,
      isActive: true,
    },
  });

  return NextResponse.json({ promoted: true, user: updated });
}
