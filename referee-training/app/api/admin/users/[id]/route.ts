import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin, isDeveloper, isAdmin } from "@/lib/roles";
import { getAuthedUser } from "@/lib/api-auth";

/**
 * PATCH /api/admin/users/[id]
 *
 * Super admins: status, role, profileComplete, association (move between FAs),
 * rank, international federation, and international category.
 * FA admins: association, rank, international federation, and international
 * category (account fields — role, status, profile — stay super-admin only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const caller = await getAuthedUser();
    const callerRole = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || !caller || !isAdmin(callerRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(callerRole);
    const { id } = await params;
    const body = await request.json();
    const {
      isActive,
      role,
      profileComplete,
      associationId,
      rankId,
      internationalAssociationId,
      internationalRankId,
    } = body ?? {};

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, associationId: true, internationalAssociationId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Admins may manage the federation hierarchy fields (association, rank,
    // international federation + category) for anyone. Account-level fields
    // stay super-admin only.
    if (!superAdmin) {
      if (isActive !== undefined || role !== undefined || profileComplete !== undefined) {
        return NextResponse.json(
          { error: "Only super admins can change status, role, or profile state." },
          { status: 403 }
        );
      }
    }

    // Validate role (super admin only path).
    if (role !== undefined && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (role === "DEVELOPER" && !isSuperAdmin(callerRole)) {
      return NextResponse.json({ error: "Only super admins can assign the DEVELOPER role." }, { status: 403 });
    }
    if (session.user.id === id && isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }
    if (session.user.id === id && role && !isSuperAdmin(role) && !isDeveloper(role)) {
      return NextResponse.json({ error: "You cannot downgrade your own role." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (superAdmin && typeof isActive === "boolean") {
      data.isActive = isActive;
      data.disabledAt = isActive ? null : new Date();
    }
    if (superAdmin && role) data.role = role;
    if (superAdmin && typeof profileComplete === "boolean") data.profileComplete = profileComplete;

    // The association the referee will belong to after this update.
    let effectiveAssociationId = target.associationId;

    // Moving a referee between FAs resets their rank because ranks belong to
    // a specific association. The FA must be a national association.
    if (associationId !== undefined) {
      const newAssoc = associationId
        ? await prisma.association.findUnique({
            where: { id: associationId },
            select: { id: true, isInternational: true },
          })
        : null;
      if (associationId && !newAssoc) {
        return NextResponse.json({ error: "Association not found." }, { status: 404 });
      }
      if (newAssoc?.isInternational) {
        return NextResponse.json(
          { error: "Use the international federation field for FIFA, UEFA, and other confederations." },
          { status: 400 }
        );
      }
      data.associationId = associationId || null;
      effectiveAssociationId = associationId || null;
      if (effectiveAssociationId !== target.associationId) {
        data.rankId = null;
      }
    }

    // Rank assignment: the rank must belong to the referee's (effective) FA.
    if (rankId !== undefined) {
      if (rankId === null || rankId === "") {
        data.rankId = null;
      } else {
        const rank = await prisma.rank.findUnique({
          where: { id: rankId },
          select: { id: true, associationId: true },
        });
        if (!rank || rank.associationId !== effectiveAssociationId) {
          return NextResponse.json({ error: "That rank is not part of this referee's association." }, { status: 400 });
        }
        data.rankId = rankId;
      }
    }

    // International federation membership (FIFA, UEFA, ...). Changing or
    // clearing it resets the category, because categories belong to a
    // specific federation.
    let effectiveInternationalId = target.internationalAssociationId;
    if (internationalAssociationId !== undefined) {
      if (internationalAssociationId === null || internationalAssociationId === "") {
        data.internationalAssociationId = null;
        data.internationalRankId = null;
        effectiveInternationalId = null;
      } else {
        const federation = await prisma.association.findUnique({
          where: { id: internationalAssociationId },
          select: { id: true, isInternational: true },
        });
        if (!federation || !federation.isInternational) {
          return NextResponse.json({ error: "Invalid international federation." }, { status: 400 });
        }
        data.internationalAssociationId = internationalAssociationId;
        effectiveInternationalId = internationalAssociationId;
        if (internationalAssociationId !== target.internationalAssociationId) {
          data.internationalRankId = null;
        }
      }
    }

    // International category: must belong to the referee's (effective)
    // international federation.
    if (internationalRankId !== undefined) {
      if (internationalRankId === null || internationalRankId === "") {
        data.internationalRankId = null;
      } else {
        const category = await prisma.rank.findUnique({
          where: { id: internationalRankId },
          select: { id: true, associationId: true },
        });
        if (
          !category ||
          !effectiveInternationalId ||
          category.associationId !== effectiveInternationalId
        ) {
          return NextResponse.json(
            { error: "That category is not part of this referee's international federation." },
            { status: 400 }
          );
        }
        data.internationalRankId = internationalRankId;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authProvider: true,
        profileComplete: true,
        isActive: true,
        disabledAt: true,
        associationId: true,
        association: { select: { id: true, name: true, countryCode: true } },
        rank: { select: { id: true, name: true } },
        internationalAssociationId: true,
        internationalAssociation: { select: { id: true, name: true, countryCode: true } },
        internationalRank: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
