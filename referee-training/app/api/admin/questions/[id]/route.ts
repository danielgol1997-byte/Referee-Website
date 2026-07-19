import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";

type AnswerOptionPatch = {
  id?: string;
  label: string;
  code?: string;
  isCorrect?: boolean;
  order?: number;
};

class ReferencedAnswerOptionError extends Error {}

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

async function updateQuestionAndAnswerOptions(
  questionId: string,
  data: Record<string, unknown>,
  answerOptions: AnswerOptionPatch[]
) {
  return prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: questionId },
      data,
    });

    const existingOptions = await tx.answerOption.findMany({
      where: { questionId },
      include: {
        _count: {
          select: { testAnswers: true },
        },
      },
    });

    const existingById = new Map(existingOptions.map((opt) => [opt.id, opt]));
    const existingByCode = new Map(existingOptions.map((opt) => [opt.code, opt]));
    const keptOptionIds = new Set<string>();

    for (const [idx, opt] of answerOptions.entries()) {
      const existing =
        (opt.id ? existingById.get(opt.id) : undefined) ??
        (opt.code ? existingByCode.get(opt.code) : undefined);
      const optionData = {
        label: opt.label,
        code: opt.code ?? existing?.code ?? `OPT_${idx}`,
        isCorrect: !!opt.isCorrect,
        order: opt.order ?? idx,
      };

      if (existing) {
        keptOptionIds.add(existing.id);
        await tx.answerOption.update({
          where: { id: existing.id },
          data: optionData,
        });
      } else {
        const created = await tx.answerOption.create({
          data: {
            ...optionData,
            questionId,
          },
        });
        keptOptionIds.add(created.id);
      }
    }

    const optionsToRemove = existingOptions.filter((opt) => !keptOptionIds.has(opt.id));
    const referencedOptions = optionsToRemove.filter((opt) => opt._count.testAnswers > 0);
    if (referencedOptions.length > 0) {
      throw new ReferencedAnswerOptionError(
        "Cannot remove answer options that are referenced by historical test answers."
      );
    }

    if (optionsToRemove.length > 0) {
      await tx.answerOption.deleteMany({
        where: {
          id: { in: optionsToRemove.map((opt) => opt.id) },
        },
      });
    }

    return tx.question.findUniqueOrThrow({
      where: { id: questionId },
      include: { answerOptions: true, category: true },
    });
  });
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
      answerOptions?: AnswerOptionPatch[];
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
      question = await updateQuestionAndAnswerOptions(resolvedParams.id, data, answerOptions);
    } else {
      question = await prisma.question.update({
        where: { id: resolvedParams.id },
        data,
        include: { answerOptions: true, category: true },
      });
    }

    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof ReferencedAnswerOptionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[ADMIN][QUESTION][PATCH]", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  const resolvedParams = await params;

  try {
    await prisma.question.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][QUESTION][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
