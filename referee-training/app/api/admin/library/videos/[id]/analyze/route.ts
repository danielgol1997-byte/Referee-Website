import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runVideoAnalysisPipeline } from "@/lib/ai/analyze-pipeline";

// Video download + Gemini file processing + analysis can take a few minutes.
export const maxDuration = 300;

/**
 * POST /api/admin/library/videos/[id]/analyze
 *
 * Runs the full analysis pipeline (Gemini watches the clip → fills empty tag
 * categories only → generates the search description → approves and embeds).
 * Used for manual re-runs from the admin UI and for bulk indexing.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await runVideoAnalysisPipeline(id, {
      processedById: (session.user as any).id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Video analysis pipeline error:", error);
    const message: string = error?.message || "";
    if (message === "Video not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Video has no file URL") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: message.includes("GEMINI_API_KEY")
          ? "Gemini API key is not configured on the server."
          : "Video analysis failed",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
