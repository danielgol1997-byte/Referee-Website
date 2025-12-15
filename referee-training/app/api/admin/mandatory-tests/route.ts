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

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return unauthorized();

  // Only show mandatory and public tests (exclude user-generated tests)
  // Super admin page is for creating mandatory and public tests only
  const tests = await prisma.mandatoryTest.findMany({
    where: {
      isUserGenerated: false, // Exclude all user-generated tests, even those created by super admins
    },
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
    } = body ?? {};

    // Only super admins can create mandatory tests
    if (isMandatory && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only super admins can create mandatory tests" }, { status: 403 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }

    if (!totalQuestions || totalQuestions < 1) {
      return NextResponse.json({ error: "totalQuestions is required and must be at least 1." }, { status: 400 });
    }

    let category = categoryId as string | null;
    if (!category && categorySlug) {
      const found = await prisma.category.findUnique({ where: { slug: categorySlug } });
      category = found?.id ?? null;
    }
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 400 });
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
