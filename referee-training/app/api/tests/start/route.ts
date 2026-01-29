import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTestSession } from "@/lib/test-service";
import { CategoryType, QuestionType } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { categorySlug, categoryType, type, totalQuestions } = body ?? {};

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  try {
    const { session: testSession } = await createTestSession({
      userId: session.user.id,
      type: type as QuestionType,
      categorySlug,
      categoryType: categoryType as CategoryType | undefined,
      totalQuestions: totalQuestions ?? 10,
    });
    return NextResponse.json({ session: testSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start test";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

