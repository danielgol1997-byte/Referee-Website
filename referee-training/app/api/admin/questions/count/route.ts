import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const categorySlug = searchParams.get('categorySlug');
    const isActive = searchParams.get('isActive');
    const excludeVar = searchParams.get('excludeVar');
    const lawNumbers = searchParams.getAll('lawNumbers').map(n => parseInt(n)).filter(n => !isNaN(n));

    const where: any = {};

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
