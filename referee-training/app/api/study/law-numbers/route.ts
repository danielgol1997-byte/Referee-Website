import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/study/law-numbers
 * Get distinct law numbers from all active questions
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeVar = searchParams.get("includeVar") === "true";

    // Build the filter for questions
    const questionFilter: any = {
      type: "LOTG_TEXT",
      isActive: true,
    };

    // Filter out VAR questions by default unless requested
    if (!includeVar) {
      questionFilter.isVar = false;
    }

    // Get only lawNumbers field from questions (much lighter query)
    const questions = await prisma.question.findMany({
      where: questionFilter,
      select: {
        lawNumbers: true,
      },
    });

    // Extract all unique law numbers
    const allLaws = new Set<number>();
    questions.forEach((q) => {
      if (q.lawNumbers && Array.isArray(q.lawNumbers)) {
        q.lawNumbers.forEach((lawNum: number) => allLaws.add(lawNum));
      }
    });

    const lawNumbers = Array.from(allLaws).sort((a, b) => a - b);

    return NextResponse.json({ lawNumbers });
  } catch (error) {
    console.error("Error fetching law numbers:", error);
    return NextResponse.json(
      { error: "Failed to fetch law numbers" },
      { status: 500 }
    );
  }
}
