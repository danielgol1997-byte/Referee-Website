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
    const mandatoryTestId = body?.mandatoryTestId as string | undefined;
    const includeVarProvided = body?.includeVar !== undefined;
    const includeVar = body?.includeVar === true;
    
    // If mandatoryTestId is provided, fetch the test to get its totalQuestions
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

    // If mandatoryTestId is provided, use the test's configuration
    let finalIncludeVar = includeVar;
    if (mandatoryTestId) {
      const test = await prisma.mandatoryTest.findUnique({
        where: { id: mandatoryTestId },
      });
      
      if (test) {
        // Use test's totalQuestions if not explicitly provided in request
        if (totalQuestions === undefined) {
          totalQuestions = test.totalQuestions;
        }
        // Use test's lawNumbers if not explicitly provided in request
        // Empty array means all laws, so pass undefined
        if (!lawNumbers) {
          lawNumbers = test.lawNumbers.length > 0 ? test.lawNumbers : undefined;
        }
        // Use test's includeVar if not explicitly provided in request
        if (!includeVarProvided) {
          finalIncludeVar = test.includeVar;
        }
      }
    }

    // Default to 10 if still undefined
    const finalTotalQuestions = totalQuestions && totalQuestions > 0 ? totalQuestions : 10;

    const { session: testSession } = await createTestSession({
      userId: session.user.id,
      type: QuestionType.LOTG_TEXT,
      categorySlug: "laws-of-the-game",
      categoryType: undefined,
      totalQuestions: finalTotalQuestions,
      lawNumbers,
      mandatoryTestId,
      includeVar: finalIncludeVar,
    });

    return NextResponse.json({ session: testSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start test";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

