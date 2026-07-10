import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuestionType } from "@prisma/client";
import { requireAdmin } from "@/lib/api-auth";

/**
 * FA admins may only touch questions inside their own association.
 * Returns an error response if not allowed, otherwise null.
 */
async function guardQuestionAccess(id: string, role: string, associationId: string | null) {
  if (isSuperAdmin(role)) return null;
  const question = await prisma.question.findUnique({
    where: { id },
    select: { associationId: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  if (!associationId || question.associationId !== associationId) {
    return NextResponse.json({ error: "This question is not in your association." }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const resolvedParams = await params;
  const denied = await guardQuestionAccess(resolvedParams.id, auth.user.role, auth.user.associationId);
  if (denied) return denied;

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
      isUpToDate,
      isIfab,
      answerOptions,
    }: {
      type?: QuestionType;
      lawNumber?: number | null;
      lawNumbers?: number[];
      text?: string;
      explanation?: string;
      difficulty?: number;
      isActive?: boolean;
      isUpToDate?: boolean;
      isIfab?: boolean;
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
    if (isUpToDate !== undefined) data.isUpToDate = isUpToDate;
    // Only super admins can flip the global (IFAB) flag.
    if (isIfab !== undefined && isSuperAdmin(auth.user.role)) data.isIfab = isIfab;

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
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const resolvedParams = await params;
  const denied = await guardQuestionAccess(resolvedParams.id, auth.user.role, auth.user.associationId);
  if (denied) return denied;

  try {
    await prisma.question.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][QUESTION][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
