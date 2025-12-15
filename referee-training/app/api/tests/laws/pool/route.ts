import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch active but non-mandatory tests (pool tests)
    // isActive = true (visible) AND isMandatory = false (pool, not required)
    const category = await prisma.category.findUnique({
      where: { slug: "laws-of-the-game" },
    });

    if (!category) {
      return NextResponse.json({ tests: [] });
    }

    const poolTests = await prisma.mandatoryTest.findMany({
      where: {
        categoryId: category.id,
        isActive: true, // Must be visible
        isMandatory: false, // Pool tests (not mandatory)
        OR: [
          { isUserGenerated: false }, // Public tests
          { createdById: session.user.id, isUserGenerated: true }, // User's own tests
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tests: poolTests });
  } catch (error) {
    console.error("[POOL_TESTS][GET]", error);
    return NextResponse.json({ error: "Failed to load pool tests" }, { status: 500 });
  }
}
