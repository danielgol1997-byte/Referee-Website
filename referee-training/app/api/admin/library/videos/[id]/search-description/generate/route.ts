import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateSearchDescription } from "@/lib/ai/generate-search-description";

export async function POST(
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
    const rawDescription: string = body.rawDescription || "";
    const explanationText: string = body.explanationText || "";

    const video = await prisma.videoClip.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        decisionExplanation: true,
        isEducational: true,
        restartType: true,
        sanctionType: true,
        offsideReason: true,
        playOn: true,
        noOffence: true,
        varRelevant: true,
        lawNumbers: true,
        tags: {
          include: {
            tag: {
              include: {
                category: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const explanation = explanationText || video.decisionExplanation || "";

    const metadata = {
      title: video.title,
      description: video.description,
      decisionExplanation: explanation,
      isEducational: video.isEducational,
      restartType: video.restartType,
      sanctionType: video.sanctionType,
      offsideReason: video.offsideReason,
      playOn: video.playOn,
      noOffence: video.noOffence,
      varRelevant: video.varRelevant,
      lawNumbers: video.lawNumbers,
      tags: video.tags.map((vt) => ({
        name: vt.tag.name,
        slug: vt.tag.slug,
        categoryName: vt.tag.category?.name || "Unknown",
        categorySlug: vt.tag.category?.slug || "unknown",
        isCorrectDecision: vt.isCorrectDecision,
      })),
    };

    const result = await generateSearchDescription(metadata, rawDescription);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Error generating search description:", error);
    return NextResponse.json(
      {
        error: "Failed to generate search description",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
