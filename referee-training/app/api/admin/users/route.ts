import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/users
 * List users (searchable)
 * Requires SUPER_ADMIN role
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status");
    const associationId = searchParams.get("associationId");

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    }

    if (status === "inactive") {
      where.isActive = false;
    }

    if (associationId === "none") {
      where.associationId = null;
    } else if (associationId) {
      where.associationId = associationId;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        country: true,
        level: true,
        image: true,
        authProvider: true,
        profileComplete: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        associationId: true,
        association: { select: { id: true, name: true, countryCode: true } },
        rank: { select: { id: true, name: true } },
        internationalAssociationId: true,
        internationalAssociation: { select: { id: true, name: true, countryCode: true } },
        internationalRank: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
