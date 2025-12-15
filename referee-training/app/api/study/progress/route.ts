import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mark a question as read
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    // Upsert study progress
    const progress = await prisma.studyProgress.upsert({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId,
        },
      },
      create: {
        userId: session.user.id,
        questionId,
        isRead: true,
        readAt: new Date(),
      },
      update: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("Error updating study progress:", error);
    return NextResponse.json(
      { error: "Failed to update study progress" },
      { status: 500 }
    );
  }
}

// Reset all to unread
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update all study progress for this user to unread
    await prisma.studyProgress.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        isRead: false,
        readAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting study progress:", error);
    return NextResponse.json(
      { error: "Failed to reset study progress" },
      { status: 500 }
    );
  }
}

