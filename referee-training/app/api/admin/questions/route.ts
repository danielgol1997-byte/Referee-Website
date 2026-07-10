import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, QuestionType } from "@prisma/client";
import { requireAdmin } from "@/lib/api-auth";
import { contentWhere } from "@/lib/scope";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const superAdmin = isSuperAdmin(auth.user.role);

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
  const isActive = searchParams.get("isActive");
  const isIfab = searchParams.get("isIfab");

  const where: Prisma.QuestionWhereInput = {};

  // FA admins only see global questions + their own association's questions.
  if (!superAdmin) {
    Object.assign(where, contentWhere(auth.user.associationId));
  }

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

  // Active filtering
  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
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
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const superAdmin = isSuperAdmin(auth.user.role);

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

    // Federation scope. FA admins author non-IFAB questions inside their own
    // association; super admins author global (IFAB) questions by default but
    // may target a specific association.
    const associationId = superAdmin
      ? (typeof body?.associationId === "string" && body.associationId ? body.associationId : null)
      : auth.user.associationId;
    if (!superAdmin && !associationId) {
      return NextResponse.json({ error: "Your account is not linked to an association." }, { status: 400 });
    }
    const effectiveIsIfab = superAdmin ? isIfab : false;

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
        isIfab: effectiveIsIfab,
        associationId,
        isActive: true,      // Default to active/visible
        isUpToDate: true,    // Default to current
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
