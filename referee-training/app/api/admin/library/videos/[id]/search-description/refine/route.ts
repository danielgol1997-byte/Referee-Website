import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getOpenAI } from "@/lib/openai";
import { geminiGenerateJson } from "@/lib/gemini";

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are an expert editor for a football referee training platform. An admin reviewed an AI-generated search description for a video clip and wants specific fixes applied.

Your job: apply EXACTLY the fixes the admin asked for, and change NOTHING else.

Rules:
- The admin's instruction is authoritative. If they say a detail is wrong, correct it as instructed. If they say to add/remove something, do it.
- The admin may speak in any language (Hebrew, English, etc.) — understand the instruction in any language, but ALWAYS output the description fields in English.
- Preserve everything the admin did not mention: length, structure, terminology, all other facts.
- The EXISTING TAGS provided are the officially correct decision — never contradict them.
- Keep the canonicalDescription comprehensive (do not shorten it unless explicitly asked).
- Update searchSummary and searchKeywords only when the fix affects them.

Output strict JSON:
{
  "canonicalDescription": "the revised full description",
  "searchSummary": "the revised one-line summary",
  "searchKeywords": ["revised", "keyword", "list"]
}`;

/**
 * POST /api/admin/library/videos/[id]/search-description/refine
 *
 * Applies an admin's natural-language fix instruction (typed or dictated via
 * the mic) to the current search description using OpenAI. Returns the revised
 * fields WITHOUT saving — the admin reviews and approves in the editor.
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
    const body = await request.json();
    const instruction = (body.instruction || "").trim();
    const canonicalText = (body.canonicalText || "").trim();
    const searchSummary = (body.searchSummary || "").trim();
    const searchKeywords: string[] = Array.isArray(body.searchKeywords)
      ? body.searchKeywords
      : [];

    if (!instruction) {
      return NextResponse.json({ error: "Missing fix instruction" }, { status: 400 });
    }
    if (!canonicalText) {
      return NextResponse.json(
        { error: "No description to refine — run the analysis first" },
        { status: 400 }
      );
    }

    const video = await prisma.videoClip.findUnique({
      where: { id },
      select: {
        title: true,
        tags: {
          select: {
            isCorrectDecision: true,
            tag: {
              select: {
                name: true,
                slug: true,
                category: { select: { slug: true } },
              },
            },
          },
        },
      },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const tagLines =
      video.tags.length > 0
        ? video.tags
            .map(
              (vt) =>
                `- [${vt.tag.category?.slug ?? "?"}] ${vt.tag.name}${vt.isCorrectDecision ? " ← correct decision" : ""}`
            )
            .join("\n")
        : "(none)";

    const userMessage = `VIDEO: ${video.title}

EXISTING TAGS (authoritative — the officially correct decision):
${tagLines}

CURRENT DESCRIPTION:
${canonicalText}

CURRENT SUMMARY:
${searchSummary || "(none)"}

CURRENT KEYWORDS:
${searchKeywords.join(", ") || "(none)"}

ADMIN'S FIX INSTRUCTION:
${instruction}`;

    // Gemini primary, OpenAI fallback.
    let parsed: any;
    try {
      const result = await geminiGenerateJson({
        systemInstruction: SYSTEM_PROMPT,
        messages: [{ role: "user", text: userMessage }],
        temperature: 0.2,
        maxOutputTokens: 8192,
      });
      parsed = result.parsed;
    } catch (geminiError) {
      console.warn(
        "Gemini refine failed, falling back to OpenAI:",
        geminiError instanceof Error ? geminiError.message : geminiError
      );
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI model");
      }
      parsed = JSON.parse(content);
    }

    return NextResponse.json({
      canonicalDescription: parsed.canonicalDescription || canonicalText,
      searchSummary: parsed.searchSummary ?? searchSummary,
      searchKeywords: Array.isArray(parsed.searchKeywords)
        ? parsed.searchKeywords
        : searchKeywords,
    });
  } catch (error: any) {
    console.error("Search description refine error:", error);
    return NextResponse.json(
      {
        error: "Failed to apply the fix",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
