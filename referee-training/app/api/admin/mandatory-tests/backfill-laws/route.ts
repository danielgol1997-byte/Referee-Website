import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { ok: false as const, session };
  }
  return { ok: true as const, session };
}

export async function POST() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  try {
    // Find all tests that have questionIds but no lawNumbers
    const testsToUpdate = await prisma.mandatoryTest.findMany({
      where: {
        AND: [
          { questionIds: { isEmpty: false } },
          { lawNumbers: { isEmpty: true } },
        ],
      },
    });

    let updated = 0;

    for (const test of testsToUpdate) {
      if (test.questionIds.length === 0) continue;

      // Fetch the questions
      const questions = await prisma.question.findMany({
        where: {
          id: { in: test.questionIds },
        },
        select: { lawNumber: true },
      });

      // Extract unique law numbers
      const uniqueLaws = new Set<number>();
      questions.forEach((q) => {
        if (q.lawNumber) uniqueLaws.add(q.lawNumber);
      });

      const lawNumbers = Array.from(uniqueLaws).sort((a, b) => a - b);

      // Update the test
      if (lawNumbers.length > 0) {
        await prisma.mandatoryTest.update({
          where: { id: test.id },
          data: { lawNumbers },
        });
        updated++;
      }
    }

    return NextResponse.json({ 
      message: `Successfully updated ${updated} test(s) with law numbers`,
      updated 
    });
  } catch (error) {
    console.error("[BACKFILL_LAW_NUMBERS][POST]", error);
    return NextResponse.json({ error: "Failed to backfill law numbers" }, { status: 500 });
  }
}
