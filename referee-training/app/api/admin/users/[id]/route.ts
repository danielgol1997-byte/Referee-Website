import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

/**
 * PATCH /api/admin/users/[id]
 * Update user status (activate/deactivate)
 * Requires SUPER_ADMIN role
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, role, profileComplete } = body ?? {};

    if (
      typeof isActive !== "boolean" &&
      role === undefined &&
      typeof profileComplete !== "boolean"
    ) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    if (role !== undefined && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (session.user.id === id && isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }

    if (session.user.id === id && role && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "You cannot downgrade your own role." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" && {
          isActive,
          disabledAt: isActive ? null : new Date(),
        }),
        ...(role && { role }),
        ...(typeof profileComplete === "boolean" && { profileComplete }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authProvider: true,
        profileComplete: true,
        isActive: true,
        disabledAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
