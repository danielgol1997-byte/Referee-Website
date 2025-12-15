import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = await prisma.libraryArticle.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { path: ["body"], string_contains: q } },
      ],
    },
    include: { category: true },
    take: 25,
  });

  return NextResponse.json({ results });
}

