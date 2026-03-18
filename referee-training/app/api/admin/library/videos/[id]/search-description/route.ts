import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { storeVideoEmbedding } from "@/lib/ai/embeddings";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      rawAdminDescription,
      canonicalSearchText,
      searchSummary,
      searchKeywords,
      searchDescriptionStatus,
    } = body;

    const video = await prisma.videoClip.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (rawAdminDescription !== undefined) updateData.rawAdminDescription = rawAdminDescription;
    if (canonicalSearchText !== undefined) updateData.canonicalSearchText = canonicalSearchText;
    if (searchSummary !== undefined) updateData.searchSummary = searchSummary;
    if (searchKeywords !== undefined) updateData.searchKeywords = searchKeywords;
    if (searchDescriptionStatus !== undefined) updateData.searchDescriptionStatus = searchDescriptionStatus;

    const isApproved = searchDescriptionStatus === "approved";
    if (isApproved) {
      updateData.aiProcessedAt = new Date();
      updateData.aiProcessedById = session.user.id;
    }

    const updated = await prisma.videoClip.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        rawAdminDescription: true,
        canonicalSearchText: true,
        searchSummary: true,
        searchKeywords: true,
        searchDescriptionStatus: true,
        searchDescriptionLang: true,
        aiProcessedAt: true,
      },
    });

    // Generate and store embedding when approved
    if (isApproved && canonicalSearchText) {
      try {
        await storeVideoEmbedding(id, canonicalSearchText);
      } catch (embeddingError) {
        console.error("Failed to store embedding (non-fatal):", embeddingError);
      }
    }

    return NextResponse.json({ video: updated });
  } catch (error: any) {
    console.error("Error saving search description:", error);
    return NextResponse.json(
      {
        error: "Failed to save search description",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
