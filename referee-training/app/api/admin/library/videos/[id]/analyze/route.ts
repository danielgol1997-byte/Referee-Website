import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  analyzeVideoClip,
  analysisToFactsText,
  type VideoAnalysis,
} from "@/lib/ai/analyze-video";
import { generateSearchDescription } from "@/lib/ai/generate-search-description";
import { storeVideoEmbedding } from "@/lib/ai/embeddings";

// Video download + Gemini file processing + analysis can take a few minutes.
export const maxDuration = 300;

/**
 * POST /api/admin/library/videos/[id]/analyze
 *
 * Full-auto pipeline:
 *   1. Gemini watches the clip and extracts structured visual facts + tag suggestions.
 *   2. Tag suggestions are applied ONLY to tag categories the admin left empty
 *      (admin tags always win), with a strict gate on sanction/restart (must be
 *      visibly shown in the clip). Criteria (legal judgment) is never auto-applied.
 *   3. The visual facts enrich the raw description, which feeds the existing
 *      search-description generator.
 *   4. The result is saved, approved, and embedded for semantic search — unless
 *      the analysis is too weak, in which case it is saved as a draft for review.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const video = await prisma.videoClip.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        duration: true,
        trimStart: true,
        trimEnd: true,
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
        rawAdminDescription: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: { select: { name: true, slug: true } },
              },
            },
            isCorrectDecision: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!video.fileUrl) {
      return NextResponse.json({ error: "Video has no file URL" }, { status: 400 });
    }

    // ── Step 1: Gemini video analysis ──
    const analysis = await analyzeVideoClip({
      fileUrl: video.fileUrl,
      title: video.title,
      duration: video.duration,
      trimStart: video.trimStart,
      trimEnd: video.trimEnd,
      existingTags: video.tags.map((vt) => ({
        name: vt.tag.name,
        slug: vt.tag.slug,
        categorySlug: vt.tag.category?.slug || "unknown",
      })),
    });

    // ── Step 2: apply suggestions to EMPTY tag categories only ──
    const appliedTagSlugs = await applyTagSuggestions(video.id, video.tags, analysis);

    // Update lawNumbers column only if the admin hasn't set any.
    if (video.lawNumbers.length === 0 && analysis.suggestions.lawNumbers.length > 0) {
      await prisma.videoClip.update({
        where: { id: video.id },
        data: { lawNumbers: [...analysis.suggestions.lawNumbers].sort((a, b) => a - b) },
      });
    }

    // ── Step 3: enrich the raw description with the visual facts ──
    const existingRaw = (video.rawAdminDescription || "").trim();
    const factsText = analysisToFactsText(analysis);
    const mismatchNote = buildDecisionMismatchNote(video.tags, analysis);
    const enrichedRaw = [existingRaw, factsText, mismatchNote]
      .filter(Boolean)
      .join("\n\n");

    // Guardrail: if the analysis narrative is too thin, don't auto-index garbage.
    const narrativeTooWeak = analysis.visualNarrative.trim().length < 80;

    // Re-fetch tags (they may include newly applied ones) for the generator.
    const freshTags = await prisma.videoTag.findMany({
      where: { videoId: video.id },
      select: {
        isCorrectDecision: true,
        tag: {
          select: {
            name: true,
            slug: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const metadata = {
      title: video.title,
      description: video.description,
      decisionExplanation: video.decisionExplanation,
      isEducational: video.isEducational,
      restartType: video.restartType,
      sanctionType: video.sanctionType,
      offsideReason: video.offsideReason,
      playOn: video.playOn,
      noOffence: video.noOffence,
      varRelevant: video.varRelevant,
      lawNumbers:
        video.lawNumbers.length > 0 ? video.lawNumbers : analysis.suggestions.lawNumbers,
      tags: freshTags.map((vt) => ({
        name: vt.tag.name,
        slug: vt.tag.slug,
        categoryName: vt.tag.category?.name || "Unknown",
        categorySlug: vt.tag.category?.slug || "unknown",
        isCorrectDecision: vt.isCorrectDecision,
      })),
    };

    // ── Step 4: generate canonical description, save, approve, embed ──
    let generation: Awaited<ReturnType<typeof generateSearchDescription>> | null = null;
    let generationError: string | null = null;
    try {
      generation = await generateSearchDescription(metadata, enrichedRaw);
    } catch (error: any) {
      console.error("Search description generation failed after analysis:", error);
      generationError = error?.message || "Generation failed";
    }

    const shouldIndex = !!generation && !narrativeTooWeak;
    const status = shouldIndex ? "approved" : generation ? "ai_generated" : "draft";

    const updateData: any = {
      rawAdminDescription: enrichedRaw,
      searchDescriptionLang: "en",
      searchDescriptionStatus: status,
    };
    if (generation) {
      updateData.canonicalSearchText = generation.canonicalDescription;
      updateData.searchSummary = generation.searchSummary;
      updateData.searchKeywords = generation.searchKeywords;
    }
    if (shouldIndex) {
      updateData.aiProcessedAt = new Date();
      updateData.aiProcessedById = (session.user as any).id;
    }

    await prisma.videoClip.update({ where: { id: video.id }, data: updateData });

    let embedded = false;
    if (shouldIndex && generation) {
      try {
        await storeVideoEmbedding(
          video.id,
          generation.embeddingText || generation.canonicalDescription
        );
        embedded = true;
      } catch (error) {
        console.error("Failed to store embedding after analysis (non-fatal):", error);
      }
    }

    return NextResponse.json({
      analysis,
      appliedTagSlugs,
      rawAdminDescription: enrichedRaw,
      canonicalSearchText: generation?.canonicalDescription || "",
      searchSummary: generation?.searchSummary || "",
      searchKeywords: generation?.searchKeywords || [],
      status,
      indexed: shouldIndex && embedded,
      warning: narrativeTooWeak
        ? "Analysis was low-confidence — saved for manual review instead of auto-indexing."
        : generationError
          ? `Video was analyzed but description generation failed: ${generationError}`
          : null,
    });
  } catch (error: any) {
    console.error("Video analysis pipeline error:", error);
    return NextResponse.json(
      {
        error: error?.message?.includes("GEMINI_API_KEY")
          ? "Gemini API key is not configured on the server."
          : "Video analysis failed",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Deterministic safeguard (no AI involved): if the card visible in the clip
 * conflicts with the sanction tag the admin set, inject an explicit note into
 * the text that feeds the description generator, so the final description
 * always frames the tagged decision as correct and the on-field card as the
 * referee's mistake. This also makes the error itself searchable
 * (e.g. "referee showed yellow instead of red").
 */
function buildDecisionMismatchNote(
  existingTags: Array<{
    tag: { slug: string; name: string; category: { slug: string } | null };
  }>,
  analysis: VideoAnalysis
): string | null {
  const shown = analysis.visual.onScreenCardShown;
  if (shown !== "yellow" && shown !== "red") return null;

  const sanctionTag = existingTags.find(
    (vt) => vt.tag.category?.slug === "sanction"
  );
  if (!sanctionTag) return null;

  const correctSlug = sanctionTag.tag.slug;
  const isConsistent =
    (shown === "yellow" && correctSlug === "yellow-card") ||
    (shown === "red" && correctSlug === "red-card");
  if (isConsistent) return null;

  return (
    `=== IMPORTANT: ON-FIELD DECISION DIFFERS FROM CORRECT DECISION ===\n` +
    `In the clip, the referee showed a ${shown.toUpperCase()} card. However, the officially correct decision per the expert assessment (tags) is "${sanctionTag.tag.name}". ` +
    `The referee's on-field decision in this video was INCORRECT — this clip demonstrates a refereeing error. ` +
    `The description MUST present "${sanctionTag.tag.name}" as the correct decision and describe the on-field ${shown} card as the mistake the referee made in the match. ` +
    `Never present the on-field card as the correct outcome.`
  );
}

/**
 * Applies Gemini's tag suggestions as filter tags, but ONLY for tag categories
 * that currently have no tag (admin tags always win), and ONLY for categories
 * that describe the incident itself (category / scenario / laws).
 *
 * Sanction and restart tags are NEVER auto-applied. They encode the officially
 * CORRECT decision, and the decision visible in the clip may be a refereeing
 * mistake (that is often exactly why the clip is in the training library).
 * Gemini's sanction/restart suggestions are returned to the admin UI for
 * review only. Criteria (legal judgment) is likewise never auto-applied.
 */
async function applyTagSuggestions(
  videoId: string,
  existingTags: Array<{ tag: { category: { slug: string } | null } }>,
  analysis: VideoAnalysis
): Promise<string[]> {
  const occupiedCategories = new Set(
    existingTags.map((vt) => vt.tag.category?.slug).filter(Boolean) as string[]
  );

  const s = analysis.suggestions;
  const candidates: Array<{ slug: string; categorySlug: string }> = [];

  if (s.categorySlug && !occupiedCategories.has("category") && analysis.confidence.category !== "low") {
    candidates.push({ slug: s.categorySlug, categorySlug: "category" });
  }
  if (s.scenarioSlug && !occupiedCategories.has("scenario")) {
    candidates.push({ slug: s.scenarioSlug, categorySlug: "scenario" });
  }
  if (!occupiedCategories.has("laws") && s.lawNumbers.length > 0) {
    for (const n of s.lawNumbers) {
      candidates.push({ slug: `law-${n}`, categorySlug: "laws" });
    }
  }

  if (candidates.length === 0) return [];

  const tags = await prisma.tag.findMany({
    where: {
      slug: { in: candidates.map((c) => c.slug) },
      isActive: true,
      category: { slug: { in: [...new Set(candidates.map((c) => c.categorySlug))] } },
    },
    select: { id: true, slug: true },
  });

  if (tags.length === 0) return [];

  await prisma.videoTag.createMany({
    data: tags.map((t) => ({
      videoId,
      tagId: t.id,
      isCorrectDecision: false,
      decisionOrder: 0,
    })),
    skipDuplicates: true,
  });

  return tags.map((t) => t.slug);
}
