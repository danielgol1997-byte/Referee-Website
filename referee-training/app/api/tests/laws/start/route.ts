import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTestSession } from "@/lib/test-service";
import { QuestionType } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const lawNumbersRaw = body?.lawNumbers;
    const mandatoryTestId =
      typeof body?.mandatoryTestId === "string" && body.mandatoryTestId.trim()
        ? body.mandatoryTestId
        : undefined;
    const includeVar = body?.includeVar === true;

    let totalQuestions = typeof body?.totalQuestions === "number" 
      ? body.totalQuestions 
      : body?.totalQuestions 
        ? Number(body.totalQuestions) 
        : undefined;
    
    let lawNumbers =
      Array.isArray(lawNumbersRaw) && lawNumbersRaw.length > 0
        ? lawNumbersRaw
            .map((n) => Number(n))
            .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 17)
        : undefined;

    // Stored tests define their own scope. Never let clients weaken a mandatory
    // or public pool test by overriding question count, laws, or VAR inclusion.
    let finalIncludeVar = includeVar;
    if (mandatoryTestId) {
      const test = await prisma.mandatoryTest.findFirst({
        where: {
          id: mandatoryTestId,
          category: { slug: "laws-of-the-game" },
          isActive: true,
          OR: [
            { isMandatory: true },
            { isMandatory: false, isUserGenerated: false },
            { isMandatory: false, isUserGenerated: true, createdById: session.user.id },
          ],
        },
        select: {
          totalQuestions: true,
          lawNumbers: true,
          includeVar: true,
        },
      });

      if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }

      totalQuestions = test.totalQuestions;
      // Empty array means all laws, so pass undefined.
      lawNumbers = test.lawNumbers.length > 0 ? test.lawNumbers : undefined;
      finalIncludeVar = test.includeVar;
    }

    // Default to 10 if still undefined
    const finalTotalQuestions = totalQuestions && totalQuestions > 0 ? totalQuestions : 10;

    const { session: testSession, questions } = await createTestSession({
      userId: session.user.id,
      type: QuestionType.LOTG_TEXT,
      categorySlug: "laws-of-the-game",
      categoryType: undefined,
      totalQuestions: finalTotalQuestions,
      lawNumbers,
      mandatoryTestId,
      includeVar: finalIncludeVar,
    });

    return NextResponse.json({ session: testSession, questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start test";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

