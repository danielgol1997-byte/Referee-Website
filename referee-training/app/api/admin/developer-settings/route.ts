import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDeveloper } from "@/lib/roles";

// GET /api/admin/developer-settings
export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.developerSettings.upsert({
      where: { id: "default" },
      create: { id: "default", searchLoggingEnabled: true },
      update: {},
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PATCH /api/admin/developer-settings
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { searchLoggingEnabled } = body;

    const settings = await prisma.developerSettings.upsert({
      where: { id: "default" },
      create: { id: "default", searchLoggingEnabled: searchLoggingEnabled ?? true },
      update: { ...(typeof searchLoggingEnabled === "boolean" && { searchLoggingEnabled }) },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
