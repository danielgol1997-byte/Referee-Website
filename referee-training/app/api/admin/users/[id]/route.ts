import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin, isDeveloper } from "@/lib/roles";

/**
 * PATCH /api/admin/users/[id]
 * Update user status / role / profileComplete.
 * Requires SUPER_ADMIN or DEVELOPER.
 * Only SUPER_ADMIN or DEVELOPER may assign the DEVELOPER role.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const callerRole = (session?.user as any)?.role;

    if (!session?.user || !isSuperAdmin(callerRole)) {
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

    // Only SUPER_ADMIN or DEVELOPER can assign DEVELOPER role
    if (role === "DEVELOPER" && !isSuperAdmin(callerRole)) {
      return NextResponse.json({ error: "Only super admins and developers can assign the DEVELOPER role." }, { status: 403 });
    }

    if (session.user.id === id && isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }

    // Prevent self-downgrade (SUPER_ADMIN can't downgrade themselves, DEVELOPER can't either)
    if (session.user.id === id && role && !isSuperAdmin(role) && !isDeveloper(role)) {
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
