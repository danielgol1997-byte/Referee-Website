import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { contentWhere } from "@/lib/scope";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const categorySlug = searchParams.get('categorySlug');
    const isActive = searchParams.get('isActive');
    const excludeVar = searchParams.get('excludeVar');
    const lawNumbers = searchParams.getAll('lawNumbers').map(n => parseInt(n)).filter(n => !isNaN(n));

    const where: any = {};

    // FA admins count global + their own association's questions.
    if (!isSuperAdmin(auth.user.role)) {
      Object.assign(where, contentWhere(auth.user.associationId));
    }

    if (type) where.type = type;
    if (isActive === 'true') where.isActive = true;
    if (excludeVar === 'true') where.isVar = false;
    
    // Always count only up-to-date questions for user-facing tests
    where.isUpToDate = true;

    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug }
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (lawNumbers.length > 0) {
      where.lawNumbers = { hasSome: lawNumbers };
    }

    const count = await prisma.question.count({ where });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[ADMIN][QUESTIONS][COUNT]", error);
    return NextResponse.json({ error: "Failed to count questions" }, { status: 500 });
  }
}
