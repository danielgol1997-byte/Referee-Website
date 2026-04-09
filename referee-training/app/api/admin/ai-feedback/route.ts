import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/ai-feedback — submit feedback on an AI-generated description
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, videoTitle, rawInput, existingTags, aiOutput, aiSuggestedTags, rating, issueType, note } = body;

    if (!videoId || !rawInput || !aiOutput || typeof rating !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const feedback = await prisma.aiGenerationFeedback.create({
      data: {
        videoId,
        videoTitle: videoTitle ?? null,
        rawInput,
        existingTags: existingTags ?? null,
        aiOutput,
        aiSuggestedTags: Array.isArray(aiSuggestedTags) ? aiSuggestedTags : [],
        rating: Math.min(5, Math.max(1, rating)),
        issueType: issueType ?? null,
        note: note ?? null,
        createdById: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error: any) {
    console.error("AI feedback submit error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

// GET /api/admin/ai-feedback — list all feedback entries (super admin only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.aiGenerationFeedback.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.aiGenerationFeedback.count(),
    ]);

    return NextResponse.json({ entries, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error("AI feedback fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
