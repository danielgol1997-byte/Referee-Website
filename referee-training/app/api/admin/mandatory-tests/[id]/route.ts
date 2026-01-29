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
    const { 
      title, 
      description, 
      lawNumbers, 
      questionIds, 
      totalQuestions, 
      passingScore, 
      dueDate, 
      isActive, 
      isMandatory,
      includeVar 
    } = body;

    // Build update data dynamically
    const updateData: any = {};
    
    // Fields that any authorized user can update (super admin or owner of user-generated test)
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (lawNumbers !== undefined) updateData.lawNumbers = lawNumbers;
    if (questionIds !== undefined) updateData.questionIds = questionIds;
    if (totalQuestions !== undefined) updateData.totalQuestions = totalQuestions;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (includeVar !== undefined) updateData.includeVar = includeVar;
    
    // Validate and set passing score
    if (passingScore !== undefined) {
      const maxQuestions = totalQuestions !== undefined ? totalQuestions : existingTest.totalQuestions;
      
      if (passingScore !== null) {
        if (passingScore < 1) {
          return NextResponse.json({ error: "Passing score must be at least 1 or null." }, { status: 400 });
        }
        if (passingScore > maxQuestions) {
          return NextResponse.json({ error: "Passing score cannot exceed total questions." }, { status: 400 });
        }
      }
      
      updateData.passingScore = passingScore;
    }
    
    // For random mode tests, validate that enough questions are available
    const finalLawNumbers = lawNumbers !== undefined ? lawNumbers : existingTest.lawNumbers;
    const finalTotalQuestions = totalQuestions !== undefined ? totalQuestions : existingTest.totalQuestions;
    const finalIncludeVar = includeVar !== undefined ? includeVar : existingTest.includeVar;
    const finalQuestionIds = questionIds !== undefined ? questionIds : existingTest.questionIds;

    // Only validate for random mode (no specific question IDs)
    if (!finalQuestionIds || finalQuestionIds.length === 0) {
      const questionWhere: any = { 
        type: "LOTG_TEXT",
        categoryId: existingTest.categoryId,
        isActive: true,
        isUpToDate: true  // Only count up-to-date questions
      };
      
      if (!finalIncludeVar) {
        questionWhere.isVar = false;
      }
      
      if (finalLawNumbers && finalLawNumbers.length > 0) {
        questionWhere.lawNumbers = { hasSome: finalLawNumbers };
      }

      const availableCount = await prisma.question.count({ where: questionWhere });
      
      if (availableCount < finalTotalQuestions) {
        const lawsText = finalLawNumbers && finalLawNumbers.length > 0 
          ? `for Law(s) ${finalLawNumbers.join(", ")}` 
          : "for all laws";
        return NextResponse.json({ 
          error: `Not enough questions available. Only ${availableCount} question(s) exist ${lawsText}${finalIncludeVar ? " (including VAR)" : " (excluding VAR)"}. Please reduce the number of questions to ${availableCount} or fewer, or add more laws.`,
          availableCount 
        }, { status: 400 });
      }
    }
    
    // Fields that ONLY super admins can update
    // Regular users cannot make tests mandatory or change visibility
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
