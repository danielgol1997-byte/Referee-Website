import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDefaultPrompt, getAllDefaultPromptKeys } from "@/lib/ai/prompt-loader";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await prisma.aiPromptConfig.findMany({
      orderBy: { key: "asc" },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const defaultKeys = getAllDefaultPromptKeys();
    const existingKeys = new Set(configs.map((c) => c.key));

    const defaults = defaultKeys
      .filter((key) => !existingKeys.has(key))
      .map((key) => {
        const d = getDefaultPrompt(key)!;
        return {
          id: null,
          key,
          name: key === "search_description_generation"
            ? "Search Description Generation"
            : "User Query Enhancement",
          description: key === "search_description_generation"
            ? "AI prompt for generating canonical search descriptions from admin input + tags"
            : "AI prompt for enhancing user search queries with synonyms and tag inference",
          systemPrompt: d.systemPrompt,
          userPromptTemplate: d.userPromptTemplate,
          model: "gpt-4o-mini",
          temperature: 0.3,
          maxTokens: 2000,
          isActive: true,
          isDefault: true,
          updatedBy: null,
        };
      });

    return NextResponse.json({
      configs: [
        ...configs.map((c) => ({ ...c, isDefault: false })),
        ...defaults,
      ],
    });
  } catch (error: any) {
    console.error("Error fetching AI configs:", error);
    return NextResponse.json({ error: "Failed to fetch AI configs" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      key,
      name,
      description,
      systemPrompt,
      userPromptTemplate,
      model,
      temperature,
      maxTokens,
      isActive,
    } = body;

    if (!key || !systemPrompt) {
      return NextResponse.json(
        { error: "key and systemPrompt are required" },
        { status: 400 }
      );
    }

    const config = await prisma.aiPromptConfig.upsert({
      where: { key },
      update: {
        name: name || key,
        description,
        systemPrompt,
        userPromptTemplate: userPromptTemplate || null,
        model: model || "gpt-4o-mini",
        temperature: temperature ?? 0.3,
        maxTokens: maxTokens ?? 2000,
        isActive: isActive ?? true,
        updatedById: session.user.id,
      },
      create: {
        key,
        name: name || key,
        description,
        systemPrompt,
        userPromptTemplate: userPromptTemplate || null,
        model: model || "gpt-4o-mini",
        temperature: temperature ?? 0.3,
        maxTokens: maxTokens ?? 2000,
        isActive: isActive ?? true,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Error updating AI config:", error);
    return NextResponse.json({ error: "Failed to update AI config" }, { status: 500 });
  }
}
