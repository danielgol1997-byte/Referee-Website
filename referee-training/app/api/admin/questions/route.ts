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
  const lawNumberParams = searchParams.getAll("lawNumber");
  const lawNumbers = searchParams.get("lawNumbers");
  const categorySlug = searchParams.get("categorySlug");
  const type = searchParams.get("type") as QuestionType | null;
  const ids = searchParams.get("ids");
  const includeVar = searchParams.get("includeVar") === "true";
  const onlyVar = searchParams.get("onlyVar") === "true";
  const upToDate = searchParams.get("upToDate") === "true";
  const outdated = searchParams.get("outdated") === "true";
  const isIfab = searchParams.get("isIfab");

  const where: Prisma.QuestionWhereInput = {};

  // VAR filtering
  if (onlyVar) {
    where.isVar = true;
  } else if (!includeVar) {
    where.isVar = false;
  }

  // Up to date filtering
  if (upToDate) {
    where.isUpToDate = true;
  } else if (outdated) {
    where.isUpToDate = false;
  }

  // IFAB filtering
  if (isIfab === "true") {
    where.isIfab = true;
  } else if (isIfab === "false") {
    where.isIfab = false;
  }


  // Filter by specific IDs if provided
  if (ids) {
    const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idArray.length > 0) {
      where.id = { in: idArray };
    }
  }

  // Handle lawNumbers filter (multiple laws from URL params)
  if (lawNumberParams.length > 0) {
    const lawNumberArray = lawNumberParams
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));
    if (lawNumberArray.length > 0) {
      // Find questions that contain ANY of the specified law numbers
      where.lawNumbers = { hasSome: lawNumberArray };
    }
  } else if (lawNumbers) {
    // Legacy support for comma-separated lawNumbers parameter
    const lawNumberArray = lawNumbers.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
    if (lawNumberArray.length > 0) {
      where.lawNumbers = { hasSome: lawNumberArray };
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
      lawNumbers,
      text,
      explanation,
      difficulty = 1,
      answerOptions = [],
      isIfab = true,
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

    // Handle lawNumbers - accept either lawNumbers array or legacy lawNumber
    let finalLawNumbers: number[] = [];
    if (lawNumbers && Array.isArray(lawNumbers)) {
      finalLawNumbers = lawNumbers.filter((n: any) => typeof n === 'number' && !isNaN(n));
    } else if (lawNumber !== undefined && lawNumber !== null) {
      // Legacy support for single lawNumber
      finalLawNumbers = [lawNumber];
    }

    const question = await prisma.question.create({
      data: {
        type,
        categoryId: category,
        lawNumbers: finalLawNumbers,
        text,
        explanation,
        difficulty,
        isIfab,
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
