import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  const resolvedParams = await params;

  try {
    const body = await req.json();
    const {
      type,
      lawNumber,
      lawNumbers,
      text,
      explanation,
      difficulty,
      isActive,
      answerOptions,
    }: {
      type?: QuestionType;
      lawNumber?: number | null;
      lawNumbers?: number[];
      text?: string;
      explanation?: string;
      difficulty?: number;
      isActive?: boolean;
      answerOptions?: Array<{ label: string; code?: string; isCorrect?: boolean; order?: number }>;
    } = body ?? {};

    const data: Record<string, unknown> = {};
    if (type) data.type = type;
    
    // Handle lawNumbers - accept either lawNumbers array or legacy lawNumber
    if (lawNumbers !== undefined) {
      data.lawNumbers = Array.isArray(lawNumbers) ? lawNumbers : [];
    } else if (lawNumber !== undefined) {
      // Legacy support for single lawNumber
      data.lawNumbers = lawNumber !== null ? [lawNumber] : [];
    }
    
    if (text) data.text = text;
    if (explanation) data.explanation = explanation;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (isActive !== undefined) data.isActive = isActive;

    let question;
    if (answerOptions) {
      // Replace answer options
      question = await prisma.question.update({
        where: { id: resolvedParams.id },
        data: {
          ...data,
          answerOptions: {
            deleteMany: {},
            create: answerOptions.map((opt, idx) => ({
              label: opt.label,
              code: opt.code ?? `OPT_${idx}`,
              isCorrect: !!opt.isCorrect,
              order: opt.order ?? idx,
            })),
          },
        },
        include: { answerOptions: true, category: true },
      });
    } else {
      question = await prisma.question.update({
        where: { id: resolvedParams.id },
        data,
        include: { answerOptions: true, category: true },
      });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("[ADMIN][QUESTION][PATCH]", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  const resolvedParams = await params;
  const questionId = resolvedParams.id;

  try {
    const [existingAnswer, activeSession, mandatoryTest] = await Promise.all([
      prisma.testAnswer.findFirst({
        where: { questionId },
        select: { id: true },
      }),
      prisma.testSession.findFirst({
        where: {
          questionIds: { has: questionId },
          completedAt: null,
        },
        select: { id: true },
      }),
      prisma.mandatoryTest.findFirst({
        where: { questionIds: { has: questionId } },
        select: { id: true },
      }),
    ]);

    if (existingAnswer || activeSession || mandatoryTest) {
      return NextResponse.json(
        {
          error:
            "Question cannot be deleted while it is referenced by answers, active sessions, or mandatory tests.",
        },
        { status: 409 }
      );
    }

    await prisma.question.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][QUESTION][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
