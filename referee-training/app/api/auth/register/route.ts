import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 400 });
    }

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashed,
        role: "REFEREE",
        authProvider: "credentials",
        profileComplete: false,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

