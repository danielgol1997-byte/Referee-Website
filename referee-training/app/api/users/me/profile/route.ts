import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      email: true,
      name: true,
      country: true,
      level: true,
      profileComplete: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const country = typeof body?.country === "string" ? body.country.trim() : "";
  const level = typeof body?.level === "string" ? body.level.trim() : "";

  if (!name || !country) {
    return NextResponse.json({ error: "Name and country are required." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name,
      country,
      level: level || null,
      profileComplete: true,
    },
    select: {
      email: true,
      name: true,
      country: true,
      level: true,
      profileComplete: true,
    },
  });

  return NextResponse.json({ user });
}
