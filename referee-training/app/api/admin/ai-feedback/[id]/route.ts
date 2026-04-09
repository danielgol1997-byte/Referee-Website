import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDeveloper } from "@/lib/roles";

// PATCH /api/admin/ai-feedback/[id] — edit a feedback note/rating/issueType
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rating, issueType, note } = body;

    const updated = await prisma.aiGenerationFeedback.update({
      where: { id },
      data: {
        ...(typeof rating === "number" && { rating: Math.min(5, Math.max(1, rating)) }),
        ...(issueType !== undefined && { issueType: issueType || null }),
        ...(note !== undefined && { note: note || null }),
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error("AI feedback edit error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}

// DELETE /api/admin/ai-feedback/[id] — delete a feedback entry
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isDeveloper((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.aiGenerationFeedback.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("AI feedback delete error:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
