import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/library/videos/analyze-all
 *
 * Returns the queue of videos that still need AI analysis/indexing, plus
 * overall coverage counts. The client runs the queue by calling
 * POST /api/admin/library/videos/[id]/analyze for each id sequentially.
 *
 * ?force=true returns ALL videos with a file (full re-index).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const baseWhere = { fileUrl: { not: "" } };

    const [total, approved, pending] = await Promise.all([
      prisma.videoClip.count({ where: baseWhere }),
      prisma.videoClip.count({
        where: { ...baseWhere, searchDescriptionStatus: "approved" },
      }),
      prisma.videoClip.findMany({
        where: force
          ? baseWhere
          : {
              ...baseWhere,
              OR: [
                { searchDescriptionStatus: { notIn: ["approved", "analyzing"] } },
                // Recover videos stuck in "analyzing" (e.g. a crashed run):
                // if nothing touched them for 15+ minutes, requeue them.
                {
                  searchDescriptionStatus: "analyzing",
                  updatedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
                },
              ],
            },
        select: { id: true, title: true, searchDescriptionStatus: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      total,
      approved,
      queue: pending.map((v) => ({
        id: v.id,
        title: v.title,
        status: v.searchDescriptionStatus,
      })),
    });
  } catch (error) {
    console.error("Error building analyze-all queue:", error);
    return NextResponse.json(
      { error: "Failed to build the analysis queue" },
      { status: 500 }
    );
  }
}
