import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lawNumber = searchParams.get("lawNumber"); // Legacy single law support
    const lawNumbers = searchParams.get("lawNumbers"); // New multiple laws support
    const readStatus = searchParams.get("readStatus"); // "read", "unread", or "all"
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

    // Filter by law numbers if provided (support both single and multiple)
    if (lawNumbers) {
      // Multiple law numbers (comma-separated)
      const lawNumberArray = lawNumbers.split(",").map((num) => parseInt(num.trim())).filter((num) => !isNaN(num));
      if (lawNumberArray.length > 0) {
        // Find questions that contain ANY of the specified law numbers
        questionFilter.lawNumbers = { hasSome: lawNumberArray };
      }
    } else if (lawNumber && lawNumber !== "all") {
      // Legacy single law number support
      const parsedLawNumber = parseInt(lawNumber);
      if (!isNaN(parsedLawNumber)) {
        questionFilter.lawNumbers = { has: parsedLawNumber };
      }
    }

    // Get questions with minimal fields (no answerOptions or category - not needed for study mode)
    const questions = await prisma.question.findMany({
      where: questionFilter,
      select: {
        id: true,
        text: true,
        explanation: true,
        lawNumbers: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: "asc" },
      ],
    });

    // Get user's study progress for these questions
    const questionIds = questions.map((q) => q.id);
    const studyProgress = questionIds.length > 0
      ? await prisma.studyProgress.findMany({
          where: {
            userId: session.user.id,
            questionId: { in: questionIds },
          },
        })
      : [];

    let favorites: { questionId: string }[] = [];
    if (questionIds.length > 0) {
      try {
        favorites = await prisma.questionFavorite.findMany({
          where: {
            userId: session.user.id,
            questionId: { in: questionIds },
          },
          select: { questionId: true },
        });
      } catch (favoriteError) {
        console.error("Error fetching favorites:", favoriteError);
        favorites = [];
      }
    }

    // Create a map for quick lookup
    const progressMap = new Map(
      studyProgress.map((sp) => [sp.questionId, sp])
    );
    const favoriteSet = new Set(favorites.map((favorite) => favorite.questionId));

    // Combine questions with progress
    let questionsWithProgress = questions.map((q) => {
      const progress = progressMap.get(q.id);
      return {
        ...q,
        isRead: progress?.isRead ?? false,
        readAt: progress?.readAt ?? null,
        isStarred: favoriteSet.has(q.id),
      };
    });

    // Filter by read status if provided
    if (readStatus === "read") {
      questionsWithProgress = questionsWithProgress.filter((q) => q.isRead);
    } else if (readStatus === "unread") {
      questionsWithProgress = questionsWithProgress.filter((q) => !q.isRead);
    }

    return NextResponse.json({
      questions: questionsWithProgress,
      total: questionsWithProgress.length,
    });
  } catch (error) {
    console.error("Error fetching study questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch study questions" },
      { status: 500 }
    );
  }
}

