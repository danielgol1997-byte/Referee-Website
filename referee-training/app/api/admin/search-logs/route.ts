import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDeveloper } from "@/lib/roles";

// GET /api/admin/search-logs — list search query logs (developer only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 30;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.searchQueryLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.searchQueryLog.count(),
    ]);

    return NextResponse.json({ entries, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error("Search logs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

// DELETE /api/admin/search-logs — clear all logs (developer only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.searchQueryLog.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Search logs clear error:", error);
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
  }
}
