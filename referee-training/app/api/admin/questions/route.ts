import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, QuestionType } from "@prisma/client";

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

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  const { searchParams } = new URL(req.url);
  const lawNumber = searchParams.get("lawNumber");
  const categorySlug = searchParams.get("categorySlug");
  const type = searchParams.get("type") as QuestionType | null;
  const ids = searchParams.get("ids");

  const where: Prisma.QuestionWhereInput = {};

  // Filter by specific IDs if provided
  if (ids) {
    const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idArray.length > 0) {
      where.id = { in: idArray };
    }
  }

  if (lawNumber) {
    const parsed = Number(lawNumber);
    if (!Number.isNaN(parsed)) {
      where.lawNumber = parsed;
    }
  }

  if (type) {
    where.type = type;
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });
    if (category) {
      where.categoryId = category.id;
    }
  }

  const questions = await prisma.question.findMany({
    where,
    include: { answerOptions: true, category: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  try {
    const body = await req.json();
    const {
      type,
      categorySlug,
      categoryId,
      lawNumber,
      text,
      explanation,
      difficulty = 1,
      answerOptions = [],
    } = body ?? {};

    if (!type || !text || !explanation) {
      return NextResponse.json({ error: "type, text, and explanation are required." }, { status: 400 });
    }

    let category = categoryId as string | null;
    if (!category && categorySlug) {
      const found = await prisma.category.findUnique({ where: { slug: categorySlug } });
      category = found?.id ?? null;
    }
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        type,
        categoryId: category,
        lawNumber: lawNumber ?? null,
        text,
        explanation,
        difficulty,
        answerOptions: {
          create: (answerOptions as Array<{ label: string; code?: string; isCorrect?: boolean; order?: number }>).map(
            (opt, idx) => ({
              label: opt.label,
              code: opt.code ?? `OPT_${idx}`,
              isCorrect: !!opt.isCorrect,
              order: opt.order ?? idx,
            })
          ),
        },
      },
      include: { answerOptions: true, category: true },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN][QUESTION][POST]", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}
