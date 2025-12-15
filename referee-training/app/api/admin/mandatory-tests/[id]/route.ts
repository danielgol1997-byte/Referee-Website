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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if test exists and user has permission
    const existingTest = await prisma.mandatoryTest.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Allow super admin to edit any test, or users to edit their own user-generated tests
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const isOwner = existingTest.createdById === session.user.id && existingTest.isUserGenerated;
    
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, lawNumbers, questionIds, totalQuestions, passingScore, dueDate, isActive, isMandatory } = body;

    // Build update data dynamically
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (lawNumbers !== undefined) updateData.lawNumbers = lawNumbers;
    if (questionIds !== undefined) updateData.questionIds = questionIds;
    if (totalQuestions !== undefined) updateData.totalQuestions = totalQuestions;
    if (passingScore !== undefined) updateData.passingScore = passingScore;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    // Only super admins can change these fields
    if (isSuperAdmin) {
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isMandatory !== undefined) updateData.isMandatory = isMandatory;
    }

    const test = await prisma.mandatoryTest.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error("[ADMIN][MANDATORY_TEST][PATCH]", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if test exists and user has permission
    const existingTest = await prisma.mandatoryTest.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Allow super admin to delete any test, or users to delete their own user-generated tests
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const isOwner = existingTest.createdById === session.user.id && existingTest.isUserGenerated;
    
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.mandatoryTest.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][MANDATORY_TEST][DELETE]", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
