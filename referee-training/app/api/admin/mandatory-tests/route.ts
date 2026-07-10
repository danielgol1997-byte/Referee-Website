import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { contentWhere } from "@/lib/scope";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Only show mandatory and public tests (exclude user-generated tests).
  // FA admins additionally see only global + their own association's tests.
  const where: Record<string, unknown> = { isUserGenerated: false };
  if (!isSuperAdmin(auth.user.role)) {
    Object.assign(where, contentWhere(auth.user.associationId));
  }

  const tests = await prisma.mandatoryTest.findMany({
    where,
    include: { category: true, completions: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tests });
}

export async function POST(req: Request) {
  // Allow both super admins and regular users (for user-generated tests)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      description,
      categorySlug,
      categoryId,
      lawNumbers,
      questionIds,
      totalQuestions,
      passingScore,
      dueDate,
      isActive = true,
      isMandatory = false,
      isUserGenerated = false,
      includeVar = false,
      includeIfab = true,
      includeCustom = false,
    } = body ?? {};

    // User-generated LOTG tests are always IFAB-only.
    const effectiveIncludeIfab = isUserGenerated ? true : includeIfab;
    const effectiveIncludeCustom = isUserGenerated ? false : includeCustom;

    const superAdmin = isSuperAdmin(session.user.role);
    const adminRole = superAdmin || session.user.role === "ADMIN" || session.user.role === "DEVELOPER";

    // Only admins (FA or super) can create mandatory / public admin tests.
    if (!isUserGenerated && !adminRole) {
      return NextResponse.json({ error: "Only admins can create admin tests" }, { status: 403 });
    }

    // Federation scope. User-generated + super-admin tests default to global;
    // FA admins' admin tests are scoped to their own association.
    const associationId = isUserGenerated
      ? null
      : superAdmin
        ? (typeof body?.associationId === "string" && body.associationId ? body.associationId : null)
        : (session.user.associationId ?? null);
    if (!isUserGenerated && !superAdmin && !associationId) {
      return NextResponse.json({ error: "Your account is not linked to an association." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    if (!totalQuestions || totalQuestions < 1) {
      return NextResponse.json({ error: "totalQuestions is required and must be at least 1." }, { status: 400 });
    }

    // Validate passing score
    if (passingScore !== null && passingScore !== undefined) {
      if (passingScore < 1) {
        return NextResponse.json({ error: "passingScore must be at least 1 or null." }, { status: 400 });
      }
      if (passingScore > totalQuestions) {
        return NextResponse.json({ error: "passingScore cannot exceed totalQuestions." }, { status: 400 });
      }
    }

    let category = categoryId as string | null;
    if (!category && categorySlug) {
      const found = await prisma.category.findUnique({ where: { slug: categorySlug } });
      category = found?.id ?? null;
    }
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 400 });
    }

    // For random mode, validate that enough questions are available
    if (!questionIds || questionIds.length === 0) {
      // Build the same query criteria that will be used when creating test sessions
      const questionWhere: any = { 
        type: "LOTG_TEXT",
        categoryId: category,
        isActive: true,
        isUpToDate: true,  // Only count up-to-date questions
        // Scope the availability check to the pool this test will draw from.
        ...contentWhere(associationId),
      };
      
      // Filter by IFAB status based on include flags
      if (effectiveIncludeIfab && !effectiveIncludeCustom) {
        questionWhere.isIfab = true;
      } else if (!effectiveIncludeIfab && effectiveIncludeCustom) {
        questionWhere.isIfab = false;
      }
      // If both or neither, don't add any isIfab filter
      
      if (!includeVar) {
        questionWhere.isVar = false;
      }
      
      if (lawNumbers && lawNumbers.length > 0) {
        questionWhere.lawNumbers = { hasSome: lawNumbers };
      }

      const availableCount = await prisma.question.count({ where: questionWhere });
      
      if (availableCount < totalQuestions) {
        const lawsText = lawNumbers && lawNumbers.length > 0 
          ? `for Law(s) ${lawNumbers.join(", ")}` 
          : "for all laws";
        const questionTypes: string[] = [];
        if (effectiveIncludeIfab && effectiveIncludeCustom) questionTypes.push("IFAB & Custom");
        else if (!effectiveIncludeIfab && effectiveIncludeCustom) questionTypes.push("Custom only");
        else if (effectiveIncludeIfab && !effectiveIncludeCustom) questionTypes.push("IFAB only");
        else questionTypes.push("No sources selected");
        if (includeVar) questionTypes.push("including VAR");
        else questionTypes.push("excluding VAR");
        
        return NextResponse.json({ 
          error: `Not enough questions available. Only ${availableCount} question(s) exist ${lawsText} (${questionTypes.join(", ")}). Please reduce the number of questions to ${availableCount} or fewer.`,
          availableCount 
        }, { status: 400 });
      }
    }

    // Respect the isUserGenerated flag from the request
    // - Tests from "Build Your Own Test" section: isUserGenerated = true (user's personal tests)
    // - Tests from super admin page: isUserGenerated = false (public/mandatory tests)
    const test = await prisma.mandatoryTest.create({
      data: {
        title,
        description,
        categoryId: category,
        lawNumbers: lawNumbers || [],
        questionIds: questionIds || [],
        totalQuestions,
        passingScore: passingScore ?? null,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isActive,
        isMandatory,
        isUserGenerated,
        includeVar,
        includeIfab: effectiveIncludeIfab,
        includeCustom: effectiveIncludeCustom,
        associationId,
        createdById: session.user.id,
      },
      include: { category: true },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN][MANDATORY_TEST][POST]", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
